/**
 * Toasts — elegant stack of notifications, bottom-right (bottom-center on mobile).
 */
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { cn } from "@/lib/utils";

const icons = {
  default: <Info size={13} />,
  success: <Check size={13} />,
  error: <AlertTriangle size={13} />,
} as const;

export function Toaster() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 md:inset-x-auto md:bottom-5 md:right-5 md:items-end">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "pointer-events-auto flex w-full max-w-90 items-start gap-3 rounded-xl border px-3.5 py-3",
              "border-line bg-[var(--panel)] shadow-[0_12px_40px_rgba(0,0,0,0.4)]",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-line",
                t.variant === "success" && "text-[var(--color-positive)]",
                t.variant === "error" && "text-[var(--color-negative)]",
                t.variant === "default" && "text-[var(--txt-dim)]",
              )}
            >
              {icons[t.variant ?? "default"]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[var(--txt)]">{t.title}</p>
              {t.description ? (
                <p className="mt-0.5 text-xs text-[var(--txt-dim)]">{t.description}</p>
              ) : null}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="cursor-pointer text-[var(--txt-faint)] transition-colors hover:text-[var(--txt)]"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
