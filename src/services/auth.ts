/**
 * Service — authentication
 */
import type { Profile, UserPreferences } from "@/types/database";
import { supabase } from "@/lib/supabase";

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return (data as Profile) ?? null;
}

export async function signUp(email: string, password: string, displayName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function updateProfile(userId: string, patch: Partial<Profile>) {
  return supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId);
}

/** Stored in user_settings.preferences (merged client-side) */
const PREFS_KEY = "mamado.prefs";

export function loadLocalPrefs(): UserPreferences {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as UserPreferences;
  } catch {
    return {} as UserPreferences;
  }
}

export function saveLocalPrefs(prefs: UserPreferences) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* noop */
  }
}
