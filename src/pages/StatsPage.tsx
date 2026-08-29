/**
 * StatsPage — minimal productivity statistics: weekly histogram, completion
 * rate, focus minutes, streak. Pure visual, whitespace-heavy.
 */
import { useCallback, useEffect, useState } from "react";
import { Flame, ListTodo, TrendingUp, Zap } from "lucide-react";
import { fetchStats, type ProductivityStats } from "@/services/stats";
import { useAuthStore } from "@/store/auth";
import { useLoadClock } from "@/hooks/useLoadClock";
import { Loader } from "@/components/loader/Loader";

export default function StatsPage() {
  const profile = useAuthStore((s) => s.profile);
  const [stats, setStats] = useState<ProductivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  useLoadClock(60_000);

  const load = useCallback(async () => {
    if (!profile) return;
    const s = await fetchStats(profile.id).catch(() => null);
    setStats(s);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !stats) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader size={64} />
      </div>
    );
  }

  const maxBar = Math.max(1, ...stats.weekly.map((d) => d.completed));

  const cards = [
    { label: "COMPLETED TODAY", value: stats.completedToday, icon: ListTodo },
    { label: "COMPLETED THIS WEEK", value: stats.completedThisWeek, icon: TrendingUp },
    { label: "FOCUS TODAY", value: `${stats.focusMinutesToday}m`, icon: Zap },
    { label: "STREAK", value: `${stats.streak}d`, icon: Flame },
  ];

  return (
    <div className="animate-rise">
      <div className="mb-8">
        <h1 className="display text-2xl tracking-wide text-[var(--txt)]">STATISTICS</h1>
        <p className="meta mt-1">LAST 30 DAYS · PERSONAL</p>
      </div>

      {/* headline cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card-surface glow-hover p-4">
            <c.icon size={15} className="mb-3 text-[var(--txt-faint)]" />
            <p className="display text-3xl leading-none text-[var(--txt)]">{c.value}</p>
            <p className="meta mt-2">{c.label}</p>
          </div>
        ))}
      </div>

      {/* weekly completion histogram */}
      <div className="card-surface mb-8 p-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-[13px] font-semibold text-[var(--txt)]">This week</h2>
            <p className="meta mt-0.5">{Math.round(stats.completionRate * 100)}% completion rate</p>
          </div>
          {stats.weekly.every((d) => d.created === 0) ? null : (
            <div className="flex items-center gap-3 text-[10px] text-[var(--txt-faint)]">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-sm bg-[var(--txt)]" /> created</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-sm bg-[var(--color-positive)]" /> completed</span>
            </div>
          )}
        </div>
        <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
          {stats.weekly.map((d, i) => {
            const isToday = i === stats.weekly.length - 1;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full items-end justify-center gap-1" style={{ height: 100 }}>
                  <div
                    className="w-2.5 rounded-t-sm bg-[color-mix(in_srgb,var(--txt)_70%,transparent)] transition-[height] duration-500"
                    style={{ height: `${Math.max(3, (d.created / maxBar) * 100)}%`, opacity: isToday ? 1 : 0.55 }}
                  />
                  <div
                    className="w-2.5 rounded-t-sm bg-[var(--color-positive)] transition-[height] duration-500"
                    style={{ height: `${Math.max(3, (d.completed / maxBar) * 100)}%`, opacity: isToday ? 1 : 0.7 }}
                  />
                </div>
                <span className={isToday ? "meta text-[var(--txt)]" : "meta"}>{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* progress bars */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Metric label="Task completion" value={Math.round(stats.completionRate * 100)} />
        <Metric
          label="Open vs. done"
          value={stats.totalTasks ? Math.round((stats.completedThisWeek / Math.max(1, stats.totalTasks)) * 100) : 0}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-surface p-4">
      <div className="mb-2 flex items-end justify-between">
        <span className="meta">{label}</span>
        <span className="display text-lg text-[var(--txt)]">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
        <div className="h-full rounded-full bg-[var(--txt)] transition-[width] duration-700" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}