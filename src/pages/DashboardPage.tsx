/**
 * DashboardPage — premium overview: today, priorities, recent music,
 * activity timeline, productivity stats. Whitespace-driven & minimal.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Flame,
  ListTodo,
  Music2,
  Timer,
  TrendingUp,
} from "lucide-react";
import type { ActivityWithUser } from "@/services/activity";
import type { TaskWithMeta, TrackWithMeta } from "@/types/database";
import { listTasks } from "@/services/tasks";
import { listTracks } from "@/services/music";
import { listActivity } from "@/services/activity";
import { fetchStats, type ProductivityStats } from "@/services/stats";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { cn, fmtDueDate, formatDateIn, isOverdue, timeAgo } from "@/lib/utils";
import { TASK_PRIORITY_META } from "@/config/constants";
import { SectionHeader, StatusDot } from "@/components/ui/bits";
import { ActivityIcon } from "@/components/activity/ActivityIcon";
import { QuoteCard } from "@/components/dashboard/QuoteCard";

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const calendar = useUIStore((s) => s.calendar);
  const [tasks, setTasks] = useState<TaskWithMeta[]>([]);
  const [tracks, setTracks] = useState<TrackWithMeta[]>([]);
  const [activity, setActivity] = useState<ActivityWithUser[]>([]);
  const [stats, setStats] = useState<ProductivityStats | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const [t, m, a, s] = await Promise.all([
      listTasks({ userId: profile.id }),
      listTracks({ userId: profile.id }).catch(() => []),
      listActivity({ userId: profile.id, limit: 10 }).catch(() => []),
      fetchStats(profile.id).catch(() => null),
    ]);
    setTasks(t);
    setTracks(m);
    setActivity(a);
    setStats(s);
  }, [profile]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(() => tasks.filter((t) => !["completed", "archived"].includes(t.status)), [tasks]);
  const completed = useMemo(() => tasks.filter((t) => t.status === "completed"), [tasks]);
  const todayTasks = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return pending.filter((t) => t.due_date && new Date(t.due_date).getTime() === start);
  }, [pending]);
  const overdueCount = useMemo(
    () => pending.filter((t) => isOverdue(t.due_date)).length,
    [pending],
  );
  const recentlyCompleted = useMemo(
    () =>
      [...completed].sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")).slice(0, 4),
    [completed],
  );
  const recentMusic = useMemo(() => tracks.slice(0, 4), [tracks]);
  const priorityCounts = useMemo(() => {
    const c: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const t of pending) if (c[t.priority] !== undefined) c[t.priority]++;
    return c;
  }, [pending]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 18 ? "GOOD AFTERNOON" : "GOOD EVENING";

  const statCards = [
    { label: "TODAY", value: todayTasks.length, icon: CalendarClock },
    { label: "PENDING", value: pending.length, icon: ListTodo },
    { label: "DONE", value: completed.length, icon: CheckCircle2 },
    { label: "STREAK", value: stats?.streak ?? 0, icon: Flame },
  ];

  const completionRate = stats?.completionRate ?? 0;

  return (
    <div className="animate-rise">
      {/* greeting */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="meta mb-2 flex items-center gap-2">
            <StatusDot /> SYSTEM ONLINE — {formatDateIn(new Date(), calendar, { withWeekday: true })}
          </p>
          <h1 className="display text-3xl tracking-wide text-[var(--txt)] sm:text-4xl">{greeting},</h1>
          <p className="display text-2xl text-[var(--txt-dim)] sm:text-3xl">
            {profile?.display_name ?? profile?.username ?? "there"}{" "}
            <span className="meta ml-2">@ {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-[10px] border border-line px-3 py-2 md:flex">
          <TrendingUp size={13} className="text-[var(--color-positive)]" />
          <span className="meta">{Math.round(completionRate * 100)}% WEEKLY COMPLETION</span>
        </div>
      </div>

      {/* stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="card-surface glow-hover flex items-center gap-3 p-4">
            <c.icon size={16} className="text-[var(--txt-faint)]" />
            <div>
              <p className="display text-2xl leading-none text-[var(--txt)]">{c.value}</p>
              <p className="meta mt-1.5">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* daily quote */}
      <div className="mb-8">
        <QuoteCard />
      </div>

      {/* priorities overview */}
      <SectionHeader title="PRIORITY OVERVIEW" hint="ACTIVE TASKS" />
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Object.entries(TASK_PRIORITY_META).map(([k, v]) => (
          <div key={k} className="rounded-[var(--radius-card)] border border-line bg-[var(--panel)] p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-[var(--txt-dim)]">
                <span className="size-2 rounded-full" style={{ background: v.dot }} />
                {v.label}
              </span>
              <span className="display text-xl text-[var(--txt)]">{priorityCounts[k] ?? 0}</span>
            </div>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[var(--line)]">
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${pending.length ? ((priorityCounts[k] ?? 0) / pending.length) * 100 : 0}%`,
                  background: v.dot,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* left column */}
        <div className="space-y-6 lg:col-span-2">
          <section>
            <SectionHeader
              title="Today"
              hint={`${todayTasks.length} due · ${overdueCount} overdue`}
              action={
                <Link to="/tasks" className="meta group flex items-center gap-1 hover:text-[var(--txt)]">
                  ALL <ChevronRight size={12} />
                </Link>
              }
            />
            {todayTasks.length === 0 ? (
              <div className="dot-grid-sm flex min-h-24 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line">
                <span className="meta">NOTHING DUE TODAY</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {todayTasks.slice(0, 4).map((t) => (
                  <Link to="/tasks" key={t.id} className="card-surface glow-hover flex items-center gap-3 p-3">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: (TASK_PRIORITY_META[t.priority] ?? TASK_PRIORITY_META.medium).dot }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--txt)]">{t.title}</span>
                    <span className={cn("meta", isOverdue(t.due_date) && "text-[var(--color-negative)]")}>
                      {t.due_date ? fmtDueDate(t.due_date, calendar) : ""}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeader
              title="Fresh music"
              action={
                <Link to="/music" className="meta group flex items-center gap-1 hover:text-[var(--txt)]">
                  LIBRARY <ChevronRight size={12} />
                </Link>
              }
            />
            {recentMusic.length === 0 ? (
              <div className="dot-grid-sm flex min-h-24 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line">
                <span className="meta">LIBRARY EMPTY — ADD MUSIC</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {recentMusic.map((m) => (
                  <Link to="/music" key={m.id} className="group">
                    {m.cover_url ? (
                      <img src={m.cover_url} alt="" loading="lazy" className="mb-2 aspect-square w-full rounded-xl border border-line object-cover transition-shadow group-hover:shadow-[0_0_30px_var(--glow)]" />
                    ) : (
                      <div className="dot-grid-sm mb-2 flex aspect-square w-full items-center justify-center rounded-xl border border-line text-[var(--txt-faint)]">
                        <Music2 size={18} />
                      </div>
                    )}
                    <p className="truncate text-xs text-[var(--txt)]">{m.title}</p>
                    <p className="meta truncate normal-case">{m.artist}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
        <div className="space-y-6">
          {overdueCount > 0 ? (
            <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--color-negative)_30%,var(--line))] bg-[color-mix(in_srgb,var(--color-negative)_6%,transparent)] px-4 py-3">
              <p className="text-xs font-medium text-[var(--color-negative)]">
                {overdueCount} task{overdueCount === 1 ? "" : "s"} overdue
              </p>
              <Link to="/tasks" className="meta mt-1 inline-block text-[var(--txt-faint)] hover:text-[var(--txt)]">
                REVIEW NOW →
              </Link>
            </div>
          ) : null}

          <section>
            <SectionHeader title="Last completed" action={<Timer size={13} className="text-[var(--txt-faint)]" />} />
            {recentlyCompleted.length === 0 ? (
              <div className="dot-grid-sm flex min-h-20 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line">
                <span className="meta">NOTHING DONE YET</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentlyCompleted.map((t) => (
                  <div key={t.id} className="card-surface flex items-center gap-2.5 p-3">
                    <CheckCircle2 size={14} className="shrink-0 text-[var(--color-positive)]" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--txt-dim)] line-through decoration-[var(--txt-faint)]">
                      {t.title}
                    </span>
                    <span className="meta">{t.completed_at ? timeAgo(t.completed_at) : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeader
              title="Activity"
              action={
                <Link to="/activity" className="meta group flex items-center gap-1 hover:text-[var(--txt)]">
                  ALL <ChevronRight size={12} />
                </Link>
              }
            />
            <div className="card-surface p-3">
              {activity.length === 0 ? (
                <p className="meta px-1 py-6 text-center">NO ACTIVITY YET</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {activity.map((a) => (
                    <div key={a.id} className="flex items-start gap-2.5">
                      <ActivityIcon type={a.type} />
                      <div className="min-w-0">
                        <p className="text-[12px] leading-snug text-[var(--txt-dim)]">{activityDescription(a)}</p>
                        <p className="meta mt-0.5">{timeAgo(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function activityDescription(a: ActivityWithUser): string {
  const meta = a.metadata as Record<string, string> | null;
  const who = a.profile?.display_name ?? a.profile?.username ?? "someone";
  if (meta?.title) return `${who} ${typeWord(a.type)} “${meta.title}”`;
  return `${who} ${typeWord(a.type)}`;
}

function typeWord(type: string): string {
  switch (type) {
    case "task.created": return "created";
    case "task.completed": return "completed";
    case "task.updated": return "updated";
    case "music.added": return "added music";
    case "music.removed": return "removed music";
    default: return type.replace(".", " · ");
  }
}