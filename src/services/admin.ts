/**
 * Service — admin & users & app settings
 */
import type { AppSetting, Profile, UserRole } from "@/types/database";
import { supabase } from "@/lib/supabase";

export async function listUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as Profile[];
}

export async function setUserRole(userId: string, role: UserRole) {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
}

/* ── App settings (key/value, admin-managed) ─────────────── */

export async function listAppSettings(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from("app_settings").select("*");
  if (error) return {};
  const out: Record<string, unknown> = {};
  for (const row of (data ?? []) as AppSetting[]) out[row.key] = row.value;
  return out;
}

export async function setAppSetting(key: string, value: unknown) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_by: (await supabase.auth.getUser()).data.user?.id ?? null });
  if (error) throw error;
}

export async function deleteAppSetting(key: string) {
  return supabase.from("app_settings").delete().eq("key", key);
}

/* ── Notifications ───────────────────────────────────────── */

export async function listNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return [];
  return data ?? [];
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  let q = supabase.from("notifications").update({ read: true }).eq("user_id", userId);
  if (ids?.length) q = q.in("id", ids);
  return q;
}
