/**
 * Popover — intelligently positioned floating panel.
 *
 * Renders into a portal (document.body) so it can NEVER be clipped by
 * parent overflow/stacking contexts, computes its position from the
 * trigger's viewport rect, and auto-flips vertically (and clamps
 * horizontally) when it would leave the screen. Closes on outside
 * click and Escape. Works on desktop and mobile.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** Anchor element (the button itself). */
  anchor: HTMLElement | null;
  children: ReactNode;
  className?: string;
  /** Preferred horizontal alignment relative to the anchor. */
  align?: "start" | "end";
  width?: number;
}

export function Popover({ open, onClose, anchor, children, className, align = "end", width = 176 }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const r = anchor.getBoundingClientRect();
      const h = panel.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // vertical: prefer below; flip above if it would overflow (8px margin)
      let top = r.bottom + 6;
      if (top + h > vh - 8) {
        const above = r.top - h - 6;
        top = above >= 8 ? above : Math.max(8, vh - h - 8);
      }
      // horizontal: clamp inside viewport
      let left = align === "end" ? r.right - width : r.left;
      left = Math.min(Math.max(8, left), vw - width - 8);
      setPos({ top, left });
    };
    place();
    const ro = new ResizeObserver(place);
    if (panelRef.current) ro.observe(panelRef.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, align, width]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          {/* invisible outside-click catcher, below the panel */}
          <div className="fixed inset-0 z-[119]" onPointerDown={onClose} aria-hidden />
          <motion.div
            ref={panelRef}
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              width,
              visibility: pos ? "visible" : "hidden",
            }}
            className={cn(
              "fixed z-[120] overflow-hidden rounded-xl border border-line bg-[var(--panel)] p-1",
              "shadow-[0_16px_50px_rgba(0,0,0,0.45)]",
              className,
            )}
          >
            {children}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
