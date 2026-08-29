/**
 * Hook — global keyboard shortcuts
 * Ctrl+K → palette | N → new task | / → search | ? → shortcuts | Esc → close
 * Ignores keystrokes while typing in inputs.
 */
import { useEffect } from "react";
import { useUIStore } from "@/store/ui";

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

interface Options {
  onNewTask?: () => void;
  onSearch?: () => void;
}

export function useKeyboardShortcuts(options: Options = {}) {
  const { onNewTask, onSearch } = options;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ui = useUIStore.getState();

      // Ctrl/Cmd + K → command palette (always wins)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.setPaletteOpen(!ui.paletteOpen);
        return;
      }

      if (e.key === "Escape") {
        if (ui.paletteOpen) ui.setPaletteOpen(false);
        if (ui.shortcutsOpen) ui.setShortcutsOpen(false);
        return;
      }

      if (isTypingTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case "n":
        case "N":
          e.preventDefault();
          onNewTask?.();
          break;
        case "/":
          e.preventDefault();
          onSearch?.();
          break;
        case "?":
          e.preventDefault();
          ui.setShortcutsOpen(!ui.shortcutsOpen);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNewTask, onSearch]);
}
