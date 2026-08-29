/**
 * useRealtime — subscribe to Postgres changes on a table, debounced callback.
 * Automatically re-subscribes on channel error; cleans up on unmount.
 */
import { useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useRealtime(
  table: string,
  onChange: () => void,
  { event = "*" as "*" | "INSERT" | "UPDATE" | "DELETE", debounceMs = 600 } = {},
) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`mamado-${table}`)
      .on(
        "postgres_changes",
        { event, schema: "public", table },
        () => {
          clearTimeout(timer);
          timer = setTimeout(() => cbRef.current(), debounceMs);
        },
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [table, event, debounceMs]);
}