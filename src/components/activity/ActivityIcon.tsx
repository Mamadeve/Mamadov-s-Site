/**
 * ActivityIcon — small map of activity types to monochrome icons.
 */
import { CheckCircle2, ListTodo, Music2, Pencil, Shield, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function ActivityIcon({ type, className }: { type: string; className?: string }) {
  let icon = <ListTodo size={13} />;
  let base = "text-[var(--txt-faint)]";

  if (type.startsWith("task.completed")) {
    icon = <CheckCircle2 size={13} />;
    base = "text-[var(--color-positive)]";
  } else if (type.startsWith("task.created")) {
    icon = <ListTodo size={13} />;
    base = "text-[var(--txt-dim)]";
  } else if (type.startsWith("task.updated")) {
    icon = <Pencil size={13} />;
    base = "text-[var(--txt-faint)]";
  } else if (type.startsWith("task.deleted") || type.startsWith("music.removed")) {
    icon = <Trash2 size={13} />;
    base = "text-[var(--color-negative)]";
  } else if (type.startsWith("music.")) {
    icon = <Music2 size={13} />;
    base = "text-[var(--txt-dim)]";
  } else if (type.startsWith("user.") || type.startsWith("admin.")) {
    icon = type.startsWith("admin.") ? <Shield size={13} /> : <User size={13} />;
    base = "text-[var(--txt-dim)]";
  }

  return (
    <span
      className={cn(
        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-[var(--panel2)]",
        base,
        className,
      )}
    >
      {icon}
    </span>
  );
}