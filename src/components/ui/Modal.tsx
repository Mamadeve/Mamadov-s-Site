/**
 * Modal — animated Liquid Glass dialog.
 *
 * Rendered through a React PORTAL into document.body so it can NEVER be
 * trapped under the header (or any transformed/stacking ancestor — the old
 * root cause of "modal goes underneath the website header"). Sits at the
 * top of the z-lattice: header z-20 < player z-40 < overlays z-80 < modal
 * z-100 < popovers z-120 < toasts z-130.
 */
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Pinned footer (always visible — action buttons never get clipped). */
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
            style={{ maxWidth: width }}
            className={cn(
              "glass-panel glass-sheen relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden",
              "rounded-t-3xl sm:rounded-2xl",
            )}
          >
            <div className="relative flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h3 className="display text-sm tracking-wide text-[var(--txt)]">{title}</h3>
                {subtitle ? <p className="meta mt-1">{subtitle}</p> : null}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="press cursor-pointer rounded-full border border-line bg-[var(--panel2)]/60 p-1.5 text-[var(--txt-faint)] transition-colors hover:text-[var(--txt)]"
              >
                <X size={14} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer ? (
              <div className="shrink-0 border-t border-line bg-[color-mix(in_srgb,var(--panel)_50%,transparent)] px-5 py-3.5 backdrop-blur-md">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
