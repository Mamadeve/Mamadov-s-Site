/**
 * Service — tasks (CRUD + filters + realtime helpers)
 * Permission rules live in RLS; the service just speaks to PostgREST.
 */
import type { Task, TaskStatus, TaskPriority, TaskWithMeta } from "@/types/database";
import { supabase } from "@/lib/supabase";

export interface TaskFilters {
  search?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  categoryId?: string;
  assigneeId?: string;
  favoritesOnly?: boolean;
  userId: string;
}

const TASK_SELECT = `
  *,
  creator:profiles!tasks_created_by_fkey(id, display_name, username, avatar_url),
  assignee:profiles!tasks_assigned_to_fkey(id, display_name, username, avatar_url),
  category:categories(id, name, color)
`;

export async function listTasks(filters: TaskFilters): Promise<TaskWithMeta[]> {
  let q = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters.status?.length) q = q.in("status", filters.status);
  if (filters.priority?.length) q = q.in("priority", filters.priority);
  if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters.assigneeId) q = q.eq("assigned_to", filters.assigneeId);
  if (filters.search) {
    const s = filters.search.replace(/[%,()]/g, " ").trim();
    if (s) q = q.ilike("title", `%${s}%`);
  }

  const { data, error } = await q;
  if (error) throw error;

  let tasks = (data ?? []) as unknown as TaskWithMeta[];

  if (filters.favoritesOnly) {
    const favIds = await listFavoriteTaskIds(filters.userId);
    const favSet = new Set(favIds);
    tasks = tasks.map((t) => ({ ...t, is_favorite: favSet.has(t.id) }));
    tasks = tasks.filter((t) => favSet.has(t.id));
  }
  return tasks;
}

export async function getTask(id: string): Promise<TaskWithMeta | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as TaskWithMeta) ?? null;
}

export interface NewTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: string | null;
  category_id?: string | null;
  tags?: string[];
  assignee_visible?: boolean;
  is_public?: boolean;
}

export async function createTask(input: NewTaskInput, userId: string): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: input.title.trim(),
      description: input.description ?? null,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      due_date: input.due_date || null,
      assigned_to: input.assigned_to ?? userId,
      category_id: input.category_id || null,
      tags: input.tags ?? [],
      assignee_visible: input.assignee_visible ?? true,
      is_public: input.is_public ?? false,
      created_by: userId,
      position: Date.now(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

/** Reorder within kanban column: pass ordered ids */
export async function reorderTasks(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, i) => ({ id, position: i }));
  const { error } = await supabase.from("tasks").upsert(updates, { ignoreDuplicates: false });
  if (error) throw error;
}

/* ── Favorites ───────────────────────────────────────────── */

export async function listFavoriteTaskIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("task_favorites")
    .select("item_id")
    .eq("user_id", userId);
  if (error) return [];
  return (data ?? []).map((r) => r.item_id as string);
}

export async function toggleTaskFavorite(userId: string, taskId: string, favorite: boolean) {
  if (favorite) {
    return supabase.from("task_favorites").insert({ user_id: userId, item_id: taskId });
  }
  return supabase
    .from("task_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("item_id", taskId);
}
