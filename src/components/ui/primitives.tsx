/**
 * UI primitives — buttons & form controls.
 * Monochrome, hairline borders, micro-interactions.
 */
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ── Button ──────────────────────────────────────────────── */

type ButtonVariant = "primary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--txt)] text-[var(--bg)] hover:opacity-88 active:opacity-80 border border-transparent",
  ghost:
    "bg-transparent text-[var(--txt-dim)] hover:text-[var(--txt)] hover:bg-[var(--panel2)] border border-transparent",
  outline:
    "bg-transparent text-[var(--txt)] border border-line hover:border-[color-mix(in_srgb,var(--txt)_40%,var(--line))] hover:bg-[var(--panel2)]",
  danger:
    "bg-transparent text-[var(--color-negative)] border border-line hover:border-[var(--color-negative)] hover:bg-[color-mix(in_srgb,var(--color-negative)_8%,transparent)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-9 px-4 text-[13px] gap-2 rounded-[10px]",
  icon: "h-8 w-8 rounded-lg justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "outline", size = "md", loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex cursor-pointer items-center font-medium tracking-tight",
        "transition-all duration-200 select-none",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  ),
);
Button.displayName = "Button";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-3 animate-spin rounded-full border border-current border-t-transparent",
        className,
      )}
    />
  );
}

/* ── Inputs ──────────────────────────────────────────────── */

const fieldBase =
  "w-full rounded-[10px] border border-line bg-[var(--panel2)] px-3 text-[13px] " +
  "placeholder:text-[var(--txt-faint)] transition-colors duration-200 " +
  "focus:border-[color-mix(in_srgb,var(--txt)_45%,var(--line))] focus:outline-none";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, "h-9", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "min-h-20 py-2 resize-none", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="meta mb-1.5 block normal-case tracking-[0.12em]">
      {children}
    </label>
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        fieldBase,
        "h-9 appearance-none bg-[var(--panel2)] pr-8",
        "[&>option]:bg-[var(--panel)] [&>option]:text-[var(--txt)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
