/**
 * ShortcutsPanel — "?" help overlay listing all keyboard shortcuts.
 */
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useUIStore } from "@/store/ui";
import { Kbd } from "@/components/ui/bits";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["CTRL", "K"], label: "Open command palette" },
  { keys: ["N"], label: "Create new task" },
  { keys: ["/"], label: "Search everything" },
  { keys: ["?"], label: "Toggle this help panel" },
  { keys: ["ESC"], label: "Close dialogs & panels" },
  { keys: ["↑", "↓", "↵"], label: "Navigate & run in palette" },
];

export function ShortcutsPanel() {
  const open = useUIStore((s) => s.shortcutsOpen);
  const setOpen = useUIStore((s) => s.setShortcutsOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" onClick={() => setOpen(false)} aria-hidden />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-line bg-[var(--panel)] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="display text-sm tracking-wide text-[var(--txt)]">KEYBOARD</h3>
                <p className="meta mt-0.5">MOVE FAST, HANDS ON KEYS</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="cursor-pointer rounded-lg p-1.5 text-[var(--txt-faint)] transition-colors hover:text-[var(--txt)]"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {SHORTCUTS.map((sc) => (
                <div key={sc.label} className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-[var(--panel2)]">
                  <span className="text-[13px] text-[var(--txt-dim)]">{sc.label}</span>
                  <span className="flex items-center gap-1">
                    {sc.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
