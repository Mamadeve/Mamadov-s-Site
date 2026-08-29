/**
 * ActivityPage — full activity timeline with human-readable timestamps.
 */
import { useCallback, useEffect, useState } from "react";
import type { ActivityWithUser } from "@/services/activity";
import { listActivity } from "@/services/activity";
import { useAuthStore } from "@/store/auth";
import { useLoadClock } from "@/hooks/useLoadClock";
import { ActivityIcon } from "@/components/activity/ActivityIcon";
import { Loader } from "@/components/loader/Loader";
import { fmtDate, timeAgo } from "@/lib/utils";

export default function ActivityPage() {
  const profile = useAuthStore((s) => s.profile);
  const [events, setEvents] = useState<ActivityWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useLoadClock(30_000);

  const load = useCallback(async () => {
    if (!profile) return;
    const data = await listActivity({ userId: profile.id, limit: 100 }).catch(() => []);
    setEvents(data);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader size={64} />
      </div>
    );
  }

  // group by day
  const groups: { label: string; items: ActivityWithUser[] }[] = [];
  for (const ev of events) {
    const day = new Date(ev.created_at);
    const label = isToday(day) ? "TODAY" : isYesterday(day) ? "YESTERDAY" : fmtDate(day).toUpperCase();
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(ev);
    else groups.push({ label, items: [ev] });
  }

  return (
    <div className="animate-rise">
      <div className="mb-8">
        <h1 className="display text-2xl tracking-wide text-[var(--txt)]">ACTIVITY</h1>
        <p className="meta mt-1">{events.length} EVENTS RECORDED</p>
      </div>

      {groups.length === 0 ? (
        <div className="dot-grid-sm flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-line">
          <span className="meta">NO ACTIVITY YET</span>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="meta mb-3 flex items-center gap-3">
                {g.label}
                <span className="h-px flex-1 bg-[var(--line)]" />
                <span>{g.items.length} EVENTS</span>
              </h2>
              <div className="relative flex flex-col gap-1 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-[var(--line)]">
                {g.items.map((ev, i) => (
                  <TimelineRow key={ev.id} ev={ev} last={i === g.items.length - 1} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineRow({ ev, last }: { ev: ActivityWithUser; last: boolean }) {
  const meta = ev.metadata as Record<string, string> | null;
  const actor = ev.profile?.display_name ?? ev.profile?.username ?? "system";
  return (
    <div className="relative flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[var(--panel2)]/50">
      <ActivityIcon type={ev.type} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-[var(--txt-dim)]">
          <span className={last ? "text-[var(--txt)]" : ""}>{description(ev.type, actor, meta?.title)}</span>
        </p>
        <p className="meta mt-1">
          <span className="text-[var(--txt-faint)]">#{ev.id.slice(0, 8)}</span>
          {" · "}
          <span className="text-[var(--txt-faint)]">{timeAgo(ev.created_at)}</span>
        </p>
      </div>
    </div>
  );
}

function description(type: string, actor: string, title?: string): string {
  const t = title ? ` “${title}”` : "";
  switch (type) {
    case "task.created": return `${actor} created task${t}`;
    case "task.completed": return `${actor} completed task${t}`;
    case "task.uncompleted": return `${actor} reopened task${t}`;
    case "task.updated": return `${actor} updated task${t}`;
    case "task.deleted": return `${actor} deleted task${t}`;
    case "music.added": return `${actor} added music${t}`;
    case "music.removed": return `${actor} removed music${t}`;
    case "user.joined": return `${actor} joined mamado`;
    case "admin.role_changed": return `${actor} changed permissions`;
    case "admin.setting_changed": return `${actor} changed application settings`;
    default: return `${actor} · ${type.replace(/\./g, " ")}`;
  }
}

function isToday(d: Date) {
  const n = new Date();
  return d.toDateString() === n.toDateString();
}
function isYesterday(d: Date) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
}