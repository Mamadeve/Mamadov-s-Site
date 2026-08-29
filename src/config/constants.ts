/**
 * MAMADO — application constants
 */

export const APP_NAME = "MAMADO";
export const APP_VERSION = "1.0.0";
export const BRAND_TAGLINE = "productivity / music OS";

export const TASK_STATUS_META: Record<
  string,
  { label: string; short: string }
> = {
  todo: { label: "Todo", short: "TODO" },
  in_progress: { label: "In Progress", short: "WIP" },
  completed: { label: "Completed", short: "DONE" },
  archived: { label: "Archived", short: "ARC" },
};

export const TASK_PRIORITY_META: Record<
  string,
  { label: string; dot: string; rank: number }
> = {
  low: { label: "Low", dot: "var(--txt-faint)", rank: 0 },
  medium: { label: "Medium", dot: "#8ab4f8", rank: 1 },
  high: { label: "High", dot: "#fbbf24", rank: 2 },
  critical: { label: "Critical", dot: "#f87171", rank: 3 },
};

export const POMODORO_DEFAULTS = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
  long_break_interval: 4,
};

export const COMMAND_PALETTE_KEY = "k";
