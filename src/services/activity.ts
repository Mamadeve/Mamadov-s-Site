/**
 * Service — activity feed
 * Rows are written by DB triggers (see supabase/schema.sql);
 * the client only reads.
 */
import type { Activity } from "@/types/database";
import { supabase } from "@/lib/supabase";

export interface ActivityWithUser extends Activity {
  profile?: Pick<
    import("@/types/database").Profile,
    "id" | "display_name" | "username" | "avatar_url"
  > | null;
}

export async function listActivity(opts: {
  userId?: string;
  limit?: number;
}): Promise<ActivityWithUser[]> {
  let q = supabase
    .from("activities")
    .select("*, profile:profiles(id, display_name, username, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as unknown as ActivityWithUser[];
}
