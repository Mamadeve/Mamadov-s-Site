/**
 * MAMADO — shared utilities
 */
import { clsx, type ClassValue } from "clsx";
import { formatJalali, localIsoDate } from "@/lib/jalali";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

/* ── Time formatting ─────────────────────────────────────── */

/** "2 minutes ago" / "Today, 18:42" / "Aug 27, 2026" */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (diff < 30_000) return "just now";
  if (diff < hour) {
    const m = Math.floor(diff / min);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (diff < day) {
    const h = Math.floor(diff / hour);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  if (diff < 2 * day) return `Yesterday, ${fmtTime(then)}`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return fmtDate(then);
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function fmtDate(ts: number | string | Date): string {
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDueDate(iso: string, calendar: "gregorian" | "persian" = "gregorian"): string {
  const d = new Date(iso);
  const today = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(d) - startOfDay(today)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (calendar === "persian") return formatJalali(iso.slice(0, 10));
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return fmtDate(d);
}

/** Format any ISO date/timestamp in the active calendar (presentation only). */
export function formatDateIn(
  iso: string | number | Date,
  calendar: "gregorian" | "persian",
  opts?: { withWeekday?: boolean },
): string {
  if (!iso) return "";
  const s = iso instanceof Date ? localIsoDate(iso) : new Date(iso).toISOString();
  if (calendar === "persian") return formatJalali(s.slice(0, 10), opts);
  const d = new Date(s);
  const base = d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  return opts?.withWeekday ? `${d.toLocaleDateString([], { weekday: "long" })}, ${base}` : base;
}

export function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

/* ── Duration ────────────────────────────────────────────── */

export function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ── Text ────────────────────────────────────────────────── */

export function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/* ── Misc ────────────────────────────────────────────────── */

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Parse a Spotify URL/URI into { type, id } — null if not spotify. */
export function parseSpotifyUrl(
  input: string,
): { type: "track" | "album" | "playlist" | "artist"; id: string } | null {
  const m = input.match(
    /(?:open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|artist)|spotify:(track|album|playlist|artist))[/:]([A-Za-z0-9]+)/,
  );
  if (!m) return null;
  return { type: m[1] as never, id: m[3] };
}

/** Basic SoundCloud URL check */
export function isSoundcloudUrl(input: string): boolean {
  return /^https?:\/\/(www\.|m\.)?soundcloud\.com\/[\w-]+\/[\w-]+/i.test(input.trim());
}

export function isValidUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
