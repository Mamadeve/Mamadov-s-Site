/**
 * useDataSync — global data synchronization.
 *
 * Combines two channels so the UI NEVER requires a manual refresh:
 *  1. Supabase realtime  → cross-user / cross-tab changes (via useRealtime)
 *  2. Local event bus    → immediate refresh after this user's own mutations
 *                          (create/update/delete/approve …) with zero latency.
 *
 * Any mutation calls `notifyDataChange(table)`; every mounted view that shows
 * that table refreshes instantly.
 */
import { useEffect } from "react";
import { useRealtime } from "@/hooks/useRealtime";

const eventName = (table: string) => `mamado:data:${table}`;

/** Fire a local data-change event — call right after a successful mutation. */
export function notifyDataChange(table: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName(table)));
}

/**
 * Subscribe a view to all changes for a table (realtime + local mutations).
 * `onChange` should be a stable-ish load callback; it is kept in a ref.
 */
export function useDataSync(table: string, onChange: () => void) {
  useRealtime(table, onChange);

  const cb = onChange;
  useEffect(() => {
    const handler = () => cb();
    window.addEventListener(eventName(table), handler);
    return () => window.removeEventListener(eventName(table), handler);
  }, [table, cb]);
}
