/**
 * TasksPage — kanban board + list view, search, filters, quick-add.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Columns3, Globe, List, Plus, Search, Filter } from "lucide-react";
import type { TaskStatus, TaskWithMeta } from "@/types/database";
import { listTasks, updateTask } from "@/services/tasks";
import { useAuthStore, useToast } from "@/store";
import { dbErrorMessage } from "@/lib/supabase";
import { useDebounce } from "@/hooks/useMisc";
import { useRealtime } from "@/hooks/useRealtime";
import { TASK_PRIORITY_META, TASK_STATUS_META } from "@/config/constants";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskModal } from "@/components/tasks/TaskModal";
import { Button, Input, Select } from "@/components/ui/primitives";
import { EmptyState, Skeleton } from "@/components/ui/bits";
import { cn } from "@/lib/utils";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "completed"];

export default function TasksPage() {
  const profile = useAuthStore((s) => s.profile);
  const toast = useToast();
  const [view, setView] = useState<"board" | "list">("board");
  const [tasks, setTasks] = useState<TaskWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [quickAdd, setQuickAdd] = useState("");
  const [editing, setEditing] = useState<TaskWithMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const quickRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(search, 250);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await listTasks({
        userId: profile.id,
        search: debouncedSearch,
        priority: priority ? [priority as TaskWithMeta["priority"]] : undefined,
      });
      setTasks(data);
    } catch (e) {
      toast({ title: "Couldn't load tasks", description: dbErrorMessage(e as never), variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [profile, debouncedSearch, priority, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  /* my tasks (board/list) vs public-only tasks shared by the admin */
  const visible = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status !== "archived" &&
          (t.created_by === profile?.id || t.assigned_to === profile?.id),
      ),
    [tasks, profile],
  );
  const publicTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.is_public &&
          t.status !== "archived" &&
          t.created_by !== profile?.id &&
          t.assigned_to !== profile?.id,
      ),
    [tasks, profile],
  );

  const toggleComplete = async (task: TaskWithMeta) => {
    const done = task.status === "completed";
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: done ? "todo" : "completed", completed_at: done ? null : new Date().toISOString() }
          : t,
      ),
    );
    try {
      await updateTask(task.id, {
        status: done ? "todo" : "completed",
        completed_at: done ? null : new Date().toISOString(),
      });
      if (!done) toast({ title: "Task completed", description: task.title, variant: "success" });
    } catch (e) {
      toast({ title: "Update failed", description: dbErrorMessage(e as never), variant: "error" });
      void load();
    }
  };

  const quickSubmit = async () => {
    const title = quickAdd.trim();
    if (!title || !profile) return;
    setQuickAdd("");
    try {
      const { createTask } = await import("@/services/tasks");
      await createTask({ title, priority: "medium" }, profile.id);
      void load();
    } catch (e) {
      toast({ title: "Couldn't create task", description: dbErrorMessage(e as never), variant: "error" });
    }
  };

  /* kanban drag & drop */
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const moveToColumn = async (id: string, col: TaskStatus) => {
    setDragOverCol(null);
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === col) return;
    const isComplete = col === "completed";
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: col, completed_at: isComplete ? new Date().toISOString() : null }
          : t,
      ),
    );
    try {
      await updateTask(id, {
        status: col,
        completed_at: isComplete ? new Date().toISOString() : null,
      });
      if (isComplete) toast({ title: "Task completed", description: task.title, variant: "success" });
    } catch (e) {
      toast({ title: "Move failed", description: dbErrorMessage(e as never), variant: "error" });
      void load();
    }
  };

  /* realtime sync — refresh when any user changes tasks */
  useRealtime("tasks", () => void load());

  return (
    <div className="animate-rise">
      {/* header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-2xl tracking-wide text-[var(--txt)]">TASKS</h1>
          <p className="meta mt-1">{visible.length} ACTIVE OBJECTS</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-[10px] border border-line">
            {(["board", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-label={`${v} view`}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs transition-colors",
                  view === v ? "bg-[var(--panel2)] text-[var(--txt)]" : "text-[var(--txt-faint)] hover:text-[var(--txt-dim)]",
                )}
              >
                {v === "board" ? <Columns3 size={13} /> : <List size={13} />}
                {v.toUpperCase()}
              </button>
            ))}
          </div>
          {/* cohesive with the view toggle: same height/rounding, calm outline */}
          <Button
            variant="outline"
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="h-[34px] rounded-[10px] px-3 py-0 text-xs"
          >
            <Plus size={13} /> New task
          </Button>
        </div>
      </div>

      {/* toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--txt-faint)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="pl-8" aria-label="Search tasks" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-[var(--txt-faint)]" />
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-32" aria-label="Filter by priority">
            <option value="">All priorities</option>
            {Object.entries(TASK_PRIORITY_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* quick add */}
      <div className="mb-6 flex items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line bg-[var(--panel)]/60 px-3 py-2 transition-colors focus-within:border-[color-mix(in_srgb,var(--txt)_35%,var(--line))]">
        <Plus size={14} className="text-[var(--txt-faint)]" />
        <input
          ref={quickRef}
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void quickSubmit()}
          placeholder="Quick add — type and press Enter"
          aria-label="Quick add task"
          className="h-7 w-full bg-transparent text-[13px] text-[var(--txt)] placeholder:text-[var(--txt-faint)] focus:outline-none"
        />
        <span className="meta rounded border border-line px-1.5 py-0.5">↵</span>
      </div>

      {/* public tasks — shared by the admin, visible per RLS */}
      {publicTasks.length > 0 ? (
        <section className="mb-6">
          <div className="mb-2.5 flex items-center gap-2">
            <Globe size={13} className="text-[var(--txt-faint)]" />
            <span className="meta">PUBLIC TASKS — {publicTasks.length} SHARED</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {publicTasks.map((t) => (
                <TaskCard key={t.id} task={t} onEdit={(task) => { setEditing(task); setModalOpen(true); }} />
              ))}
            </AnimatePresence>
          </div>
        </section>
      ) : null}

      {/* content */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState title="NO TASKS YET" description="Create your first task with quick-add above, or press N anywhere." />
      ) : view === "board" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const colTasks = visible.filter((t) => t.status === col);
            return (
              <div
                key={col}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/task-id");
                  if (id) void moveToColumn(id, col);
                }}
                className={cn(
                  "rounded-[var(--radius-card)] border border-line bg-[var(--panel)]/50 transition-colors",
                  dragOverCol === col && "border-[color-mix(in_srgb,var(--txt)_40%,var(--line))]",
                )}
                onDragEnter={() => setDragOverCol(col)}
                onDragLeave={() => setDragOverCol((c) => (c === col ? null : c))}
              >
                <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
                  <span className="meta">{TASK_STATUS_META[col].label.toUpperCase()}</span>
                  <span className="meta rounded border border-line px-1.5">{colTasks.length}</span>
                </div>
                <div className="flex min-h-24 flex-col gap-2.5 p-2.5">
                  <AnimatePresence>
                    {colTasks.map((t) => (
                      <TaskCard key={t.id} task={t} draggable onToggleComplete={toggleComplete} onEdit={(task) => { setEditing(task); setModalOpen(true); }} />
                    ))}
                  </AnimatePresence>
                  {colTasks.length === 0 ? (
                    <div className="dot-grid-sm flex h-20 items-center justify-center rounded-lg border border-dashed border-line">
                      <span className="meta">DROP HERE</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <AnimatePresence>
            {visible.map((t) => (
              <TaskCard key={t.id} task={t} onToggleComplete={toggleComplete} onEdit={(task) => { setEditing(task); setModalOpen(true); }} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}