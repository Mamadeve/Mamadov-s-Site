/**
 * MAMADO — Jalali (Persian / Shamsi) ⇄ Gregorian date conversion.
 *
 * Canonical date representation is always Gregorian (ISO `YYYY-MM-DD` for
 * date-only values, full ISO timestamps for instants). Jalali is a pure
 * *presentation* layer — every conversion here is lossless and symmetric,
 * which avoids off-by-one drift around midnight / DST because we only ever
 * convert *calendar dates* (no time-of-day, no timezone math).
 *
 * Algorithm: the well-known jalaali.js (B. Behrooz) arithmetic.
 */

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192,
  2262, 2324, 2394, 2456, 3178,
];

const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  if (jy < jp || jy >= BREAKS[bl - 1]) throw new Error("Invalid Jalali year " + jy);
  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): { jy: number; jm: number; jd: number } {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let jd: number;
  let jm: number;
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

/** Gregorian → Jalali (all inputs 1-based months). */
export function toJalaali(gy: number, gm: number, gd: number): JalaliDate {
  return d2j(g2d(gy, gm, gd));
}

/** Jalali → Gregorian. */
export function toGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  return d2g(j2d(jy, jm, jd));
}

export function jalaaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalCal(jy).leap === 1 ? 30 : 29;
}

export function isValidJalali(jy: number, jm: number, jd: number): boolean {
  return (
    jy >= -61 && jy <= 3177 &&
    jm >= 1 && jm <= 12 &&
    jd >= 1 && jd <= jalaaliMonthLength(jy, jm)
  );
}

/** Latin digits → Persian digits (presentation only). */
export function toPersianDigits(s: string | number): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  return String(s).replace(/\d/g, (d) => fa[Number(d)]);
}

export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند",
];

/** Gregorian weekday index (0=Sun) → Persian weekday name. */
export const PERSIAN_WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

/* ── Canonical date-string helpers (date-only, timezone-safe) ─────── */

/** "2026-08-28" → { jy, jm, jd } — parses the calendar date as-is, no TZ shift. */
export function isoDateToJalali(isoDate: string): JalaliDate {
  const [gy, gm, gd] = isoDate.slice(0, 10).split("-").map(Number);
  return toJalaali(gy, gm, gd);
}

/** { jy, jm, jd } → "YYYY-MM-DD" (Gregorian, canonical). */
export function jalaliToIsoDate(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${gy}-${p(gm)}-${p(gd)}`;
}

/**
 * Format an ISO date(-time) string for display in the Jalali calendar.
 * Uses the *calendar date* of the local day (no midnight-boundary drift:
 * "2026-08-28" is the same Jalali date in every timezone).
 */
export function formatJalali(iso: string, opts?: { withWeekday?: boolean; persianDigits?: boolean }): string {
  if (!iso) return "";
  const j = isoDateToJalali(iso);
  let out = `${j.jd} ${JALALI_MONTHS[j.jm - 1]} ${j.jy}`;
  if (opts?.withWeekday) {
    const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
    out = `${PERSIAN_WEEKDAYS[d.getDay()]}، ${out}`;
  }
  return opts?.persianDigits ? toPersianDigits(out) : out;
}

/** Parse user Jalali input: "1403/05/06", "1403-5-6", Persian digits → ISO date. */
export function parseJalaliInput(input: string): string | null {
  const normalized = input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .trim()
    .replace(/[.\-/\\،,]/g, "/");
  const m = normalized.match(/^(\d{3,4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  const jd = Number(m[3]);
  if (!isValidJalali(jy, jm, jd)) return null;
  return jalaliToIsoDate(jy, jm, jd);
}

/** Convert a Date to an ISO date-only string in *local* time (no UTC shift). */
export function localIsoDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

