/**
 * UI bits — badges, kbd, status dots, skeletons, empty/error states.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  dot,
}: {
  children: ReactNode;
  className?: string;
  dot?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5",
        "meta leading-[1.5] normal-case",
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full" style={{ background: dot }} /> : null}
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-line",
        "bg-[var(--panel2)] px-1 font-mono text-[10px] text-[var(--txt-dim)]",
      )}
    >
      {children}
    </kbd>
  );
}

export function StatusDot({
  color = "var(--color-positive)",
  pulse = true,
}: {
  color?: string;
  pulse?: boolean;
}) {
  return (
    <span className="relative inline-flex size-2">
      <span className="absolute inset-0 rounded-full" style={{ background: color }} />
      {pulse ? (
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-60"
          style={{ background: color, animationDuration: "2.4s" }}
        />
      ) : null}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-[10px] bg-[var(--panel2)]", className)}
      style={{ animationDuration: "1.6s" }}
    />
  );
}

export function SectionHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <h2 className="text-[13px] font-semibold tracking-tight text-[var(--txt)]">{title}</h2>
        {hint ? <p className="meta mt-0.5">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="dot-grid-sm flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line px-6 py-14 text-center">
      {icon ? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-full border border-line text-[var(--txt-faint)]">
          {icon}
        </div>
      ) : null}
      <p className="display text-sm tracking-wider text-[var(--txt)]">{title}</p>
      {description ? <p className="mt-1.5 max-w-60 text-xs text-[var(--txt-dim)]">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-[10px] border border-[color-mix(in_srgb,var(--color-negative)_35%,var(--line))] bg-[color-mix(in_srgb,var(--color-negative)_7%,transparent)] px-3 py-2 text-xs text-[var(--color-negative)]">
      {message}
    </div>
  );
}
