/**
 * FocusPage — Pomodoro focus mode.
 * Custom durations (presets + custom, persisted), distinct per-mode icons,
 * intentional mode-specific transitions, calm control hierarchy.
 * Deep loading = Aperture loader. Respects prefers-reduced-motion (via CSS).
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Armchair, Coffee, Crosshair, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import type { FocusSessionType, TaskWithMeta } from "@/types/database";
import { listTasks } from "@/services/tasks";
import { saveFocusSession } from "@/services/stats";
import { useAuthStore, useToast } from "@/store";
import { POMODORO_DEFAULTS } from "@/config/constants";
import { ApertureLoader } from "@/components/ui/CircleLoaders";
import { cn } from "@/lib/utils";

type Mode = FocusSessionType;

const MODE_LABEL: Record<Mode, string> = {
  focus: "FOCUS SESSION",
  short_break: "SHORT BREAK",
  long_break: "LONG BREAK",
};

const MODE_META: Record<
  Mode,
  { icon: typeof Crosshair; tint: string; ring: string; transition: { duration: number; ease: number[] } }
> = {
  focus: {
    icon: Crosshair,
    tint: "color-mix(in srgb, var(--txt) 3%, transparent)",
    ring: "var(--txt)",
    transition: { duration: 0.28, ease: [0.34, 1.4, 0.64, 1] }, // energetic pop
  },
  short_break: {
    icon: Coffee,
    tint: "color-mix(in srgb, var(--color-positive) 5%, transparent)",
    ring: "var(--color-positive)",
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }, // light calm fade
  },
  long_break: {
    icon: Armchair,
    tint: "color-mix(in srgb, var(--color-info) 6%, transparent)",
    ring: "var(--color-info)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }, // slow, deep
  },
};

const PRESETS: Record<Mode, number[]> = {
  focus: [25, 45, 60],
  short_break: [5, 10, 15],
  long_break: [15, 20, 30],
};

const DURATIONS_KEY = "mamado.focus.durations";

type Durations = Record<Mode, number>; // minutes

function loadDurations(): Durations {
  try {
    const raw = localStorage.getItem(DURATIONS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Durations>;
      return {
        focus: p.focus ?? POMODORO_DEFAULTS.focus / 60,
        short_break: p.short_break ?? POMODORO_DEFAULTS.short_break / 60,
        long_break: p.long_break ?? POMODORO_DEFAULTS.long_break / 60,
      };
    }
  } catch {
    /* private mode */
  }
  return {
    focus: POMODORO_DEFAULTS.focus / 60,
    short_break: POMODORO_DEFAULTS.short_break / 60,
    long_break: POMODORO_DEFAULTS.long_break / 60,
  };
}

export default function FocusPage() {
  const profile = useAuthStore((s) => s.profile);
  const toast = useToast();

  const [mode, setMode] = useState<Mode>("focus");
  const [durations, setDurations] = useState<Durations>(loadDurations);
  const [secondsLeft, setSecondsLeft] = useState(durations.focus * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [tasks, setTasks] = useState<TaskWithMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [todaySessions, setTodaySessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [customOpen, setCustomOpen] = useState<Mode | null>(null);
  const startedAtRef = useRef<string | null>(null);

  const duration = durations[mode] * 60;

  /* load pending tasks + today's session count */
  useEffect(() => {
    if (!profile) return;
    void listTasks({ userId: profile.id })
      .then((t) => setTasks(t.filter((x) => x.status !== "completed" && x.status !== "archived")))
      .catch(() => undefined)
      .finally(() => setLoading(false));
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    void listSessionsSince(start.toISOString());
  }, [profile]);

  const listSessionsSince = async (iso: string) => {
    try {
      const { listFocusSessions } = await import("@/services/stats");
      const sessions = await listFocusSessions(profile?.id ?? "", 200);
      const since = new Date(iso).getTime();
      setTodaySessions(sessions.filter((s) => s.completed && new Date(s.started_at).getTime() >= since).length);
    } catch {
      /* noop */
    }
  };

  /* reset when mode or configured duration changes */
  useEffect(() => {
    setSecondsLeft(duration);
    setRunning(false);
    startedAtRef.current = null;
  }, [duration]);

  /* persist durations */
  const updateDuration = (m: Mode, minutes: number) => {
    const clamped = Math.min(180, Math.max(1, Math.round(minutes || 1)));
    setDurations((prev) => {
      const next = { ...prev, [m]: clamped };
      try {
        localStorage.setItem(DURATIONS_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  };

  /* ticker */
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          void completePhase();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  const completePhase = async () => {
    const wasFocus = mode === "focus";
    const startedAt = startedAtRef.current ?? new Date(Date.now() - duration * 1000).toISOString();
    await saveFocusSession({
      taskId: wasFocus ? selectedId : null,
      sessionType: wasFocus ? "focus" : mode,
      durationSeconds: duration,
      startedAt,
      completed: true,
    }).catch(() => undefined);

    if (wasFocus) {
      const next = cycles + 1;
      setCycles(next);
      toast({ title: "Focus session complete", description: "Take a break.", variant: "success" });
      setMode(next % POMODORO_DEFAULTS.long_break_interval === 0 ? "long_break" : "short_break");
      setTodaySessions((x) => x + 1);
    } else {
      toast({ title: "Break over", description: "Back to focus." });
      setMode("focus");
    }
    setRunning(false);
  };

  const start = () => {
    startedAtRef.current = new Date().toISOString();
    setRunning(true);
  };

  const skip = () => {
    if (secondsLeft < duration - 2) return; // only near start
    void completePhase();
  };

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress = duration > 0 ? (duration - secondsLeft) / duration : 0;
  const meta = MODE_META[mode];
  const ModeIcon = meta.icon;

  return (
    <motion.div
      className="mx-auto max-w-3xl animate-rise"
      animate={{ background: meta.tint }}
      transition={{ duration: mode === "long_break" ? 0.9 : 0.4 }}
    >
      <div className="mb-8 text-center">
        <h1 className="display text-2xl tracking-wide text-[var(--txt)]">FOCUS MODE</h1>
        <p className="meta mt-1">{todaySessions} SESSIONS COMPLETED TODAY</p>
      </div>

      {/* mode switch — distinct icon identity per mode */}
      <div className="mb-4 flex items-center justify-center gap-2">
        {(["focus", "short_break", "long_break"] as Mode[]).map((m) => {
          const Icon = MODE_META[m].icon;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-xs transition-all duration-300",
                mode === m
                  ? "border-[color-mix(in_srgb,var(--txt)_40%,var(--line))] bg-[var(--panel2)] text-[var(--txt)] shadow-[0_0_20px_var(--glow)]"
                  : "border-line text-[var(--txt-faint)] hover:text-[var(--txt-dim)]",
              )}
            >
              <Icon size={12} />
              {m.toUpperCase().replace("_", " ")}
            </button>
          );
        })}
      </div>

      {/* duration presets + custom */}
      <div className="mb-8 flex items-center justify-center gap-1.5">
        {PRESETS[mode].map((p) => (
          <button
            key={p}
            onClick={() => updateDuration(mode, p)}
            className={cn(
              "cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] tabular-nums transition-colors",
              durations[mode] === p
                ? "border-[color-mix(in_srgb,var(--txt)_40%,var(--line))] bg-[var(--panel2)] text-[var(--txt)]"
                : "border-line text-[var(--txt-faint)] hover:text-[var(--txt-dim)]",
            )}
          >
            {p}m
          </button>
        ))}
        <span className="meta mx-1">/</span>
        {customOpen === mode ? (
          <input
            type="number"
            min={1}
            max={180}
            autoFocus
            defaultValue={durations[mode]}
            onBlur={(e) => {
              updateDuration(mode, Number(e.target.value));
              setCustomOpen(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setCustomOpen(null);
            }}
            className="h-6 w-14 rounded-full border border-line bg-[var(--panel2)] px-2 text-center text-[11px] tabular-nums focus:outline-none"
            aria-label={`Custom ${mode} minutes`}
          />
        ) : (
          <button
            onClick={() => setCustomOpen(mode)}
            className={cn(
              "cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
              !PRESETS[mode].includes(durations[mode])
                ? "border-[color-mix(in_srgb,var(--txt)_40%,var(--line))] bg-[var(--panel2)] text-[var(--txt)]"
                : "border-line text-[var(--txt-faint)] hover:text-[var(--txt-dim)]",
            )}
          >
            {PRESETS[mode].includes(durations[mode]) ? "Custom" : `${durations[mode]}m`}
          </button>
        )}
      </div>

      {/* timer disc — animated per-mode transition */}
      <div className="relative mx-auto mb-6 flex h-60 w-60 items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, scale: 0.94, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
            transition={meta.transition}
            className="absolute inset-0"
          >
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="46" fill="none" stroke="var(--line)" strokeWidth="1" />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke={meta.ring}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - progress)}
                className="transition-[stroke-dashoffset] duration-300 ease-linear"
                style={{ filter: "drop-shadow(0 0 6px var(--glow))" }}
              />
            </svg>
            <div className="dot-grid flex flex-col items-center justify-center" style={{ width: 150, height: 150, borderRadius: "50%" }}>
              <ModeIcon size={13} className="mb-1.5 text-[var(--txt-dim)]" />
              <span className="meta">{MODE_LABEL[mode]}</span>
              <span className="display mt-1 text-5xl tabular-nums text-[var(--txt)]">
                {minutes}:{secs.toString().padStart(2, "0")}
              </span>
            </div>
            {running ? (
              <span className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5">
                <span className="size-1.5 animate-pulse rounded-full bg-[var(--color-positive)]" />
                <span className="meta">LIVE</span>
              </span>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* controls — calm hierarchy: reset/skip quiet, play clearly primary */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <button
          onClick={() => { setSecondsLeft(duration); setRunning(false); }}
          aria-label="Reset"
          className="cursor-pointer rounded-full border border-line p-2.5 text-[var(--txt-dim)] transition-colors hover:border-[color-mix(in_srgb,var(--txt)_30%,var(--line))] hover:text-[var(--txt)]"
        >
          <RotateCcw size={15} />
        </button>
        <button
          onClick={() => (running ? setRunning(false) : start())}
          aria-label={running ? "Pause" : "Start"}
          className={cn(
            "flex size-14 cursor-pointer items-center justify-center rounded-full border transition-all active:scale-95",
            running
              ? "border-line bg-transparent text-[var(--txt-dim)] hover:text-[var(--txt)]"
              : "border-[color-mix(in_srgb,var(--txt)_50%,var(--line))] bg-[var(--panel2)] text-[var(--txt)] shadow-[0_0_28px_var(--glow)] hover:border-[var(--txt)]",
          )}
        >
          {running ? <Pause size={19} /> : <Play size={19} className="ml-0.5" />}
        </button>
        <button
          onClick={skip}
          aria-label="Skip phase"
          className="cursor-pointer rounded-full border border-line p-2.5 text-[var(--txt-dim)] transition-colors hover:border-[color-mix(in_srgb,var(--txt)_30%,var(--line))] hover:text-[var(--txt)]"
        >
          <SkipForward size={15} />
        </button>
      </div>

      {/* task picker */}
      <div className="card-surface mb-6 p-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <ApertureLoader size={44} label="LOADING TASKS" />
          </div>
        ) : (
          <>
            <p className="meta mb-3">LINK THIS SESSION TO A TASK</p>
            {tasks.length === 0 ? (
              <p className="text-xs text-[var(--txt-faint)]">No open tasks — create one in Tasks, or just focus.</p>
            ) : (
              <div className="max-h-44 overflow-y-auto pr-1">
                {tasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors",
                      selectedId === t.id ? "bg-[var(--panel2)] text-[var(--txt)]" : "text-[var(--txt-dim)] hover:bg-[var(--panel2)]/60",
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-[var(--txt-faint)]" />
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    {selectedId === t.id ? <span className="meta">LINKED</span> : null}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <p className="meta text-center">{cycles} CYCLES THIS SESSION</p>

    </motion.div>
  );
}

