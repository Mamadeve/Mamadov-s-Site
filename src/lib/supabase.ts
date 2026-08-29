/**
 * MAMADO — Supabase client
 * Single shared client. Credentials come from env; when missing,
 * the app renders the SetupScreen instead of crashing.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  url && anonKey && url.startsWith("http") && anonKey.length > 20,
);

export const supabaseUrl = isSupabaseConfigured ? (url as string) : "https://placeholder.supabase.co";
export const supabaseAnonKey = isSupabaseConfigured ? (anonKey as string) : "placeholder-anon-key";

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    global: {
      headers: { "x-client-info": "mamado-app" },
    },
  },
);

/** Human-readable error extraction — never leak raw Postgres to users. */
export function dbErrorMessage(error: { message?: string; code?: string } | null): string {
  if (!error) return "Something went wrong.";
  const code = error.code ?? "";
  switch (code) {
    case "23505":
    case "42501":
      return "You don't have permission to perform this action.";
    case "23503":
      return "This item references something that no longer exists.";
    case "PGRST116":
      return "Not found.";
    default:
      break;
  }
  if (/failed to fetch|network/i.test(error.message ?? ""))
    return "Network error — check your connection and try again.";

  // Auth errors — surface the real reason instead of a generic message.
  switch (code) {
    case "email_not_confirmed":
      return "Please confirm your email before signing in — check your inbox (and spam folder).";
    case "invalid_credentials":
      return "Invalid email or password.";
    case "user_not_found":
      return "No account found with this email.";
    case "user_banned":
    case "user_disabled":
      return "This account has been disabled.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a moment and try again.";
    case "same_password":
      return "New password must be different from the old one.";
    case "weak_password":
      return "Password is too weak — use at least 6 characters.";
    default:
      break;
  }
  if (/invalid login credentials/i.test(error.message ?? ""))
    return "Invalid email or password.";
  if (/email not confirmed/i.test(error.message ?? ""))
    return "Please confirm your email before signing in — check your inbox (and spam folder).";

  // Auth errors carry safe, human-readable messages — show them as-is.
  if (typeof code === "string" && /^[a-z_]+$/.test(code) && error.message)
    return error.message;

  return "Something went wrong. Please try again.";
}
