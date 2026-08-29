/**
 * SettingsPage — personal preferences + theme switcher + calendar.
 */
import { Calendar as CalendarIcon, Monitor, Moon, Palette } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { APP_VERSION, BRAND_TAGLINE } from "@/config/constants";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/ui/bits";

const THEMES = [
  { id: "dark", label: "DARK", hint: "default", icon: Moon },
  { id: "light", label: "LIGHT", hint: "pale surface", icon: Monitor },
  { id: "mono", label: "MONO", hint: "experimental", icon: Palette },
] as const;

const CALENDARS = [
  { id: "gregorian", label: "GREGORIAN", hint: "Aug 28, 2026" },
  { id: "persian", label: "PERSIAN · JALALI", hint: "۶ شهریور ۱۴۰۵" },
] as const;

export default function SettingsPage() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const calendar = useUIStore((s) => s.calendar);
  const setCalendar = useUIStore((s) => s.setCalendar);
  const profile = useAuthStore((s) => s.profile);

  return (
    <div className="mx-auto max-w-2xl animate-rise">
      <div className="mb-8">
        <h1 className="display text-2xl tracking-wide text-[var(--txt)]">SETTINGS</h1>
        <p className="meta mt-1">PREFERENCES · LOCAL</p>
      </div>

      <section className="mb-6">
        <h2 className="meta mb-3">APPEARANCE</h2>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "card-surface glow-hover flex cursor-pointer flex-col items-start gap-2 p-4 text-left transition-colors",
                theme === t.id && "border-[color-mix(in_srgb,var(--txt)_45%,var(--line))]",
              )}
            >
              <t.icon size={16} className={theme === t.id ? "text-[var(--txt)]" : "text-[var(--txt-faint)]"} />
              <span className="text-xs font-medium text-[var(--txt)]">{t.label}</span>
              <span className="meta">{t.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="meta mb-3">CALENDAR</h2>
        <div className="grid grid-cols-2 gap-3">
          {CALENDARS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCalendar(c.id)}
              className={cn(
                "card-surface glow-hover flex cursor-pointer flex-col items-start gap-2 p-4 text-left transition-colors",
                calendar === c.id && "border-[color-mix(in_srgb,var(--txt)_45%,var(--line))]",
              )}
            >
              <CalendarIcon size={16} className={calendar === c.id ? "text-[var(--txt)]" : "text-[var(--txt-faint)]"} />
              <span className="text-xs font-medium text-[var(--txt)]">{c.label}</span>
              <span className="meta normal-case tracking-normal">{c.hint}</span>
            </button>
          ))}
        </div>
        <p className="meta mt-2 normal-case tracking-normal">
          presentation only — deadlines are stored canonically (gregorian) so nothing shifts between calendars
        </p>
      </section>

      <section className="card-surface mb-6 p-5">
        <h2 className="meta mb-3">SESSION</h2>
        <div className="flex flex-col gap-3">
          <pre className="overflow-x-auto text-xs leading-relaxed text-[var(--txt-dim)]">{`user   : ${profile?.username ?? "—"}
role   : ${profile?.role?.toUpperCase() ?? "—"}
theme  : ${theme.toUpperCase()}
os     : MAMADO v${APP_VERSION}`}</pre>
        </div>
      </section>

      <section className="card-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-semibold text-[var(--txt)]">About</h2>
            <p className="meta mt-0.5">{BRAND_TAGLINE} · designed &amp; built by Mamadov</p>
          </div>
          <span className="flex items-center gap-2">
            <StatusDot /> <span className="meta">SYNCED</span>
          </span>
        </div>
      </section>
    </div>
  );
}