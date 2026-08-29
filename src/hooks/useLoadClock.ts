/**
 * useLoadClock — re-render on an interval so relative timestamps stay fresh.
 */
import { useEffect, useState } from "react";

export function useLoadClock(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}