/**
 * Service — dashboard statistics & focus sessions
 */
import type { FocusSession } from "@/types/database";
import { supabase } from "@/lib/supabase";

export interface ProductivityStats {
  tasksToday: number;
  completedToday: number;
  completedThisWeek: number;
  pending: number;
  inProgress: number;
  totalTasks: number;
  completionRate: number; // 0..1 this week
  streak: number; // consecutive days with ≥1 completion
  focusSessionsToday: number;
  focusMinutesToday: number;
  weekly: { day: string; completed: number; created: number }[];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function fetchStats(userId: string): Promise<ProductivityStats> {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  const sinceIso = startOfDay(since).toISOString();

  const [tasksRes, focusRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, status, priority, created_at, completed_at, due_date")
      .gte("created_at", sinceIso),
    supabase
      .from("focus_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("started_at", sinceIso),
  ]);

  type TaskRow = {
    id: string;
    status: string;
    priority: string;
    created_at: string;
    completed_at: string | null;
    due_date: string | null;
  };
  const tasks = (tasksRes.data ?? []) as unknown as TaskRow[];
  const sessions = ((focusRes.data ?? []) as FocusSession[]).filter((s) => s.completed);

  const today = startOfDay(new Date()).getTime();
  const weekAgo = today - 6 * 86_400_000;

  const completedToday = tasks.filter(
    (t) => t.completed_at && new Date(t.completed_at).getTime() >= today,
  ).length;
  const createdToday = tasks.filter(
    (t) => new Date(t.created_at).getTime() >= today,
  ).length;
  const completedThisWeek = tasks.filter(
    (t) => t.completed_at && new Date(t.completed_at).getTime() >= weekAgo,
  ).length;
  const createdThisWeek = tasks.filter(
    (t) => new Date(t.created_at).getTime() >= weekAgo,
  ).length;

  // Streak: consecutive days (ending today or yesterday) with ≥1 completion
  const completionDays = new Set(
    tasks
      .filter((t) => t.completed_at)
      .map((t) => startOfDay(new Date(t.completed_at!)).getTime()),
  );
  let streak = 0;
  let cursor = today;
  if (!completionDays.has(cursor)) cursor -= 86_400_000; // allow "yesterday" streaks
  while (completionDays.has(cursor)) {
    streak += 1;
    cursor -= 86_400_000;
  }

  // Weekly histogram (7 buckets, oldest → today)
  const weekly: { day: string; completed: number; created: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = today - i * 86_400_000;
    const dayEnd = dayStart + 86_400_000;
    weekly.push({
      day: DAY_NAMES[new Date(dayStart).getDay()],
      completed: tasks.filter((t) => {
        const c = t.completed_at ? new Date(t.completed_at).getTime() : -1;
        return c >= dayStart && c < dayEnd;
      }).length,
      created: tasks.filter((t) => {
        const c = new Date(t.created_at).getTime();
        return c >= dayStart && c < dayEnd;
      }).length,
    });
  }

  const todaySessions = sessions.filter(
    (s) => new Date(s.started_at).getTime() >= today,
  );

  return {
    tasksToday: createdToday,
    completedToday,
    completedThisWeek,
    pending: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    totalTasks: tasks.length,
    completionRate: createdThisWeek > 0 ? completedThisWeek / createdThisWeek : 0,
    streak,
    focusSessionsToday: todaySessions.length,
    focusMinutesToday: Math.round(
      todaySessions.reduce((acc, s) => acc + s.duration_seconds, 0) / 60,
    ),
    weekly,
  };
}

/* ── Focus sessions ──────────────────────────────────────── */

export async function saveFocusSession(input: {
  taskId: string | null;
  sessionType: "focus" | "short_break" | "long_break";
  durationSeconds: number;
  startedAt: string;
  completed: boolean;
}): Promise<void> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("focus_sessions").insert({
    user_id: data.user.id,
    task_id: input.taskId,
    session_type: input.sessionType,
    duration_seconds: Math.round(input.durationSeconds),
    started_at: input.startedAt,
    completed: input.completed,
  });
}

export async function listFocusSessions(userId: string, limit = 50): Promise<FocusSession[]> {
  const { data } = await supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as FocusSession[];
}
