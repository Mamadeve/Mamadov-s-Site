/**
 * Store — UI state: toasts, command palette, shortcuts panel, theme,
 * calendar display preference (Gregorian / Jalali).
 */
import { create } from "zustand";

export type ThemeName = "dark" | "light" | "mono";
export type CalendarPref = "gregorian" | "persian";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error";
}

interface UIState {
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  playerExpanded: boolean;
  toasts: Toast[];
  theme: ThemeName;
  calendar: CalendarPref;
  setPaletteOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setPlayerExpanded: (open: boolean) => void;
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  setTheme: (t: ThemeName) => void;
  setCalendar: (c: CalendarPref) => void;
}

const THEME_KEY = "mamado.theme";
const CALENDAR_KEY = "mamado.calendar";

function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.classList.remove("light", "mono");
  if (theme === "light") root.classList.add("light");
  if (theme === "mono") {
    root.classList.add("mono");
    root.classList.add("light"); // mono is a light experimental surface
  }
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode */
  }
}

export function getStoredTheme(): ThemeName {
  try {
    const t = localStorage.getItem(THEME_KEY) as ThemeName | null;
    if (t === "dark" || t === "light" || t === "mono") return t;
  } catch {
    /* noop */
  }
  return "dark";
}

export function getStoredCalendar(): CalendarPref {
  try {
    const c = localStorage.getItem(CALENDAR_KEY);
    if (c === "persian" || c === "gregorian") return c;
  } catch {
    /* noop */
  }
  return "gregorian";
}

// Apply persisted theme immediately at module load.
applyTheme(getStoredTheme());

export const useUIStore = create<UIState>((set, get) => ({
  paletteOpen: false,
  shortcutsOpen: false,
  playerExpanded: false,
  toasts: [],
  theme: getStoredTheme(),
  calendar: getStoredCalendar(),

  setPaletteOpen: (open) => set({ paletteOpen: open }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setPlayerExpanded: (open) => set({ playerExpanded: open }),

  toast: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), 4200);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  setCalendar: (calendar) => {
    try {
      localStorage.setItem(CALENDAR_KEY, calendar);
    } catch {
      /* private mode */
    }
    set({ calendar });
  },
}));

/** Convenience hook for firing toasts */
export const useToast = () => useUIStore((s) => s.toast);

