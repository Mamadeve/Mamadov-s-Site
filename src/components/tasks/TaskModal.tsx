/**
 * TaskModal — create & edit tasks. Full field set: title, description,
 * status, priority, due date, assignee, category, tags.
 */
import { useEffect, useMemo, useState } from "react";
import type { Category, Profile, TaskPriority, TaskStatus, TaskWithMeta } from "@/types/database";
import { Modal } from "@/components/ui/Modal";
import { Button, Input, Select, Textarea, FieldLabel } from "@/components/ui/primitives";
import { ErrorNote } from "@/components/ui/bits";
import { useAuthStore, useToast } from "@/store";
import { useUIStore } from "@/store/ui";
import { notifyDataChange } from "@/hooks/useDataSync";
import { createTask, updateTask, deleteTask } from "@/services/tasks";
import { listCategories } from "@/services/categories";
import { listUsers } from "@/services/admin";
import { dbErrorMessage } from "@/lib/supabase";
import { formatJalali, isoDateToJalali, parseJalaliInput } from "@/lib/jalali";
import { TASK_PRIORITY_META, TASK_STATUS_META } from "@/config/constants";

const EMPTY = {
  title: "",
  description: "",
  status: "todo" as TaskStatus,
  priority: "medium" as TaskPriority,
  due_date: "",
  assigned_to: "",
  category_id: "",
  tags: "",
  assignee_visible: true,
  is_public: false,
};

type FormState = typeof EMPTY;

export function TaskModal({
  open,
  onClose,
  editing,
  defaultStatus,
}: {
  open: boolean;
  onClose: () => void;
  editing?: TaskWithMeta | null;
  defaultStatus?: TaskStatus;
}) {
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === "admin";
  const calendar = useUIStore((s) => s.calendar);
  const toast = useToast();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(editing);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      editing
        ? {
            title: editing.title,
            description: editing.description ?? "",
            status: editing.status,
            priority: editing.priority,
            due_date: editing.due_date?.slice(0, 10) ?? "",
            assigned_to: editing.assigned_to ?? "",
            category_id: editing.category_id ?? "",
            tags: (editing.tags ?? []).join(", "),
            assignee_visible: editing.assignee_visible ?? true,
            is_public: editing.is_public ?? false,
          }
        : { ...EMPTY, status: defaultStatus ?? "todo" },
    );
    if (profile) {
      listCategories().then(setCategories);
      listUsers().then(setUsers);
    }
  }, [open, editing, defaultStatus, profile]);

  const canSubmit = form.title.trim().length > 0 && !saving;

  const assignable = useMemo(
    () => (isAdmin ? users : users.filter((u) => u.id === profile?.id)),
    [isAdmin, users, profile],
  );

  const submit = async () => {
    if (!profile || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        assigned_to: form.assigned_to || profile.id,
        category_id: form.category_id || null,
        tags: form.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 8),
        ...(isAdmin
          ? { assignee_visible: form.assignee_visible, is_public: form.is_public }
          : {}),
      };
      if (isEdit && editing) {
        await updateTask(editing.id, payload);
        toast({ title: "Task updated", variant: "success" });
      } else {
        await createTask(payload, profile.id);
        toast({ title: "Task created", variant: "success" });
      }
      /* instant global sync — no manual refresh needed */
      notifyDataChange("tasks");
      onClose();
    } catch (e) {
      setError(dbErrorMessage(e as { message: string }));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    setDeleting(true);
    try {
      await deleteTask(editing.id);
      toast({ title: "Task deleted" });
      notifyDataChange("tasks");
      onClose();
    } catch (e) {
      setError(dbErrorMessage(e as { message: string }));
    } finally {
      setDeleting(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "EDIT TASK" : "NEW TASK"}
      subtitle={isEdit ? `ID ${editing?.id.slice(0, 8)}` : "DEFINE THE OBJECTIVE"}
      footer={
        <div className="flex items-center gap-2">
          <Button variant="primary" className="flex-1" loading={saving} disabled={!canSubmit} onClick={() => void submit()}>
            {isEdit ? "Save changes" : "Create task"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {isEdit ? (
            <Button variant="danger" loading={deleting} onClick={() => void remove()}>
              Delete
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <FieldLabel htmlFor="task-title">Title</FieldLabel>
          <Input
            id="task-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
            }}
            placeholder="Ship the update"
            autoFocus
          />
        </div>

        <div>
          <FieldLabel htmlFor="task-desc">Description</FieldLabel>
          <Textarea
            id="task-desc"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional context, links, acceptance criteria…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
              {Object.entries(TASK_STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Priority</FieldLabel>
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
              {Object.entries(TASK_PRIORITY_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Due date {calendar === "persian" ? "(Jalali)" : ""}</FieldLabel>
            {calendar === "persian" ? (
              <>
                <Input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={form.due_date ? (() => { const j = isoDateToJalali(form.due_date); return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`; })() : ""}
                  onChange={(e) => {
                    const parsed = parseJalaliInput(e.target.value);
                    setForm({ ...form, due_date: parsed ?? (e.target.value === "" ? "" : form.due_date) });
                  }}
                  placeholder="1405/06/06"
                />
                <p className="meta mt-1 normal-case tracking-normal">
                  {form.due_date
                    ? `${formatJalali(form.due_date)} · ${form.due_date} (Gregorian)`
                    : `e.g. ${(() => { const j = isoDateToJalali(new Date().toISOString().slice(0, 10)); return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`; })()} = today`}
                </p>
              </>
            ) : (
              <>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                <p className="meta mt-1 normal-case tracking-normal">
                  {form.due_date ? formatJalali(form.due_date) : "canonical storage is Gregorian — display follows your calendar setting"}
                </p>
              </>
            )}
          </div>
          <div>
            <FieldLabel>Assigned to</FieldLabel>
            <Select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
              {assignable.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name ?? u.username ?? "user"}{u.id === profile?.id ? " (you)" : ""}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <FieldLabel>Category</FieldLabel>
          <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <FieldLabel>Tags</FieldLabel>
          <Input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="focus, deep-work"
          />
        </div>

        {isAdmin ? (
          <div className="rounded-[10px] border border-line bg-[var(--panel2)]/50 p-3">
            <p className="meta mb-2.5">ADMIN · VISIBILITY CONTROL</p>
            <div className="flex flex-col gap-2.5">
              <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-[var(--txt-dim)]">
                <span>
                  Visible to the assigned user
                  <span className="meta mt-0.5 block normal-case tracking-normal">
                    hide this task from the assignee's own dashboard
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.assignee_visible}
                  onChange={(e) => setForm({ ...form, assignee_visible: e.target.checked })}
                  className="size-4 shrink-0 cursor-pointer accent-[var(--txt)]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-[var(--txt-dim)]">
                <span>
                  Public task
                  <span className="meta mt-0.5 block normal-case tracking-normal">
                    also visible in the shared Public Tasks section
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.is_public}
                  onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                  className="size-4 shrink-0 cursor-pointer accent-[var(--txt)]"
                />
              </label>
            </div>
            <p className="meta mt-2.5 normal-case leading-relaxed tracking-normal">
              enforced at database level (row level security) — not just hidden in the ui
            </p>
          </div>
        ) : null}

        {error ? <ErrorNote message={error} /> : null}
      </div>
    </Modal>
  );
}

/** Wrapper used by the global "N" shortcut in AppShell */
export function NewTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <TaskModal open={open} onClose={onClose} />;
}
