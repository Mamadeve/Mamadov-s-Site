/**
 * MAMADO — database & domain types
 * Mirrors supabase/schema.sql. Keep both in sync.
 */

export type UserRole = "admin" | "user";

export type TaskStatus = "todo" | "in_progress" | "completed" | "archived";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type MusicSource = "spotify" | "soundcloud" | "direct" | "applemusic";

export type MusicStatus = "pending" | "approved" | "rejected";

export type FocusSessionType = "focus" | "short_break" | "long_break";

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  color: string | null;
  owner_id: string | null; // null = global (admin-managed)
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  assigned_to: string | null;
  category_id: string | null;
  tags: string[];
  position: number;
  /** Admin: hide this task from the assigned user (DB-enforced via RLS). */
  assignee_visible?: boolean;
  /** Admin: surface the task in the shared Public Tasks section. */
  is_public?: boolean;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  cover_url: string | null;
  source: MusicSource;
  source_url: string;
  duration_seconds: number | null;
  notes: string | null;
  category_id: string | null;
  /** Review workflow — non-admin submissions stay pending until approved. */
  status: MusicStatus;
  added_by: string;
  created_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface FavoriteRow {
  user_id: string;
  item_id: string;
  created_at: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  session_type: FocusSessionType;
  duration_seconds: number;
  started_at: string;
  completed: boolean;
}

export interface TrackPlay {
  id: string;
  user_id: string;
  track_id: string;
  played_at: string;
}

export interface AppSetting {
  key: string;
  value: unknown;
  updated_by: string | null;
  updated_at: string;
}

export interface UserPreferences {
  theme: "dark" | "light" | "mono";
  accentTimer?: boolean;
  defaultTaskView?: "board" | "list";
  pomodoroFocus?: number;
  pomodoroShort?: number;
  pomodoroLong?: number;
  [key: string]: unknown;
}

/** Joined shape: task + creator/assignee/profile/category info for UI */
export interface TaskWithMeta extends Task {
  creator?: Pick<Profile, "id" | "display_name" | "username" | "avatar_url"> | null;
  assignee?: Pick<Profile, "id" | "display_name" | "username" | "avatar_url"> | null;
  category?: Pick<Category, "id" | "name" | "color"> | null;
  is_favorite?: boolean;
}

export interface TrackWithMeta extends MusicTrack {
  added_by_profile?: Pick<Profile, "id" | "display_name" | "username"> | null;
  category?: Pick<Category, "id" | "name" | "color"> | null;
  is_favorite?: boolean;
}
