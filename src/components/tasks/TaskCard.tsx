/**
 * TaskCard — kanban/list card with completion animation, priority dot,
 * tags, due date. Draggable for kanban DnD.
 */
import { motion } from "framer-motion";
import { Calendar, Check, Globe, Pencil, Tag } from "lucide-react";
import type { TaskWithMeta } from "@/types/database";
import { useUIStore } from "@/store/ui";
import { cn, fmtDueDate, isOverdue, initials } from "@/lib/utils";
import { TASK_PRIORITY_META } from "@/config/constants";

export function TaskCard({
  task,
  onToggleComplete,
  onEdit,
  compact = false,
  draggable = false,
}: {
  task: TaskWithMeta;
  onToggleComplete?: (task: TaskWithMeta) => void;
  onEdit?: (task: TaskWithMeta) => void;
  compact?: boolean;
  draggable?: boolean;
}) {
  const done = task.status === "completed";
  const prio = TASK_PRIORITY_META[task.priority] ?? TASK_PRIORITY_META.medium;
  const overdue = !done && isOverdue(task.due_date);
  const calendar = useUIStore((s) => s.calendar);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      draggable={draggable}
      onDragStart={(e) => {
        const de = e as unknown as React.DragEvent;
        if (draggable && de.dataTransfer) {
          de.dataTransfer.setData("text/task-id", task.id);
          de.dataTransfer.effectAllowed = "move";
        }
      }}
      className={cn(
        "group card-surface glow-hover relative p-3.5",
        draggable && "cursor-grab active:cursor-grabbing",
        done && "opacity-55",
      )}
    >
      <div className="flex items-start gap-3">
        {/* complete toggle */}
        {onToggleComplete ? (
          <button
            onClick={() => onToggleComplete(task)}
            aria-label={done ? "Mark as todo" : "Mark as completed"}
            className={cn(
              "mt-0.5 flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all active:scale-90",
              done
                ? "border-transparent bg-[var(--txt)] text-[var(--bg)]"
                : "border-[var(--txt-faint)] text-transparent hover:border-[var(--txt)]",
            )}
          >
            <Check size={10} strokeWidth={3} />
          </button>
        ) : (
          <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: prio.dot }} />
        )}

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "cursor-pointer truncate text-[13px] font-medium text-[var(--txt)]",
              done && "line-through decoration-[var(--txt-faint)]",
            )}
            onClick={() => onEdit?.(task)}
          >
            {task.title}
          </p>
          {!compact && task.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-[var(--txt-dim)]">{task.description}</p>
          ) : null}

          <div className="meta mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 normal-case">
            {task.due_date ? (
              <span className={cn("flex items-center gap-1", overdue && "text-[var(--color-negative)]")}>
                <Calendar size={10} />
                {fmtDueDate(task.due_date, calendar)}
              </span>
            ) : null}
            {task.is_public ? (
              <span className="flex items-center gap-1 text-[var(--txt-dim)]">
                <Globe size={10} />
                public
              </span>
            ) : null}
            {task.category ? (
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full" style={{ background: task.category.color ?? "var(--txt-faint)" }} />
                {task.category.name}
              </span>
            ) : null}
            {task.assignee ? (
              <span className="flex items-center gap-1">
                <span className="flex size-3.5 items-center justify-center rounded-full border border-line text-[7px]">
                  {initials(task.assignee.display_name ?? task.assignee.username)}
                </span>
                {task.assignee.display_name ?? task.assignee.username}
              </span>
            ) : null}
          </div>

          {task.tags?.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {task.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="meta flex items-center gap-0.5 rounded border border-line px-1.5 py-px">
                  <Tag size={8} />
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {onEdit ? (
          <button
            onClick={() => onEdit(task)}
            aria-label="Edit task"
            className="cursor-pointer rounded-lg p-1.5 text-[var(--txt-faint)] opacity-0 transition-all hover:bg-[var(--panel2)] hover:text-[var(--txt)] group-hover:opacity-100"
          >
            <Pencil size={12} />
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
