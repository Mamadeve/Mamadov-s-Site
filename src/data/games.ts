/**
 * Games catalog — a small futuristic retro-arcade.
 *
 * `built-in` titles are first-party HTML5 games implemented inside MAMADO
 * (no third-party licensing or embedding concerns, fully offline-capable).
 *
 * The schema also supports `embed` entries: officially-provided game URLs
 * that allow iframe embedding. Any third-party entry must be added with a
 * legitimate, officially-permitted play URL — never scraped content.
 */
export type GameCategory = "arcade" | "puzzle" | "retro" | "reflex";

export interface GameEntry {
  id: string;
  title: string;
  category: GameCategory;
  creator: string;
  description: string;
  kind: "built-in" | "embed";
  /** For embed kind: the official play/embed URL (permits framing). */
  url?: string;
  year: string;
}

export const GAMES: GameEntry[] = [
  {
    id: "snake",
    title: "SNAKE.SYS",
    category: "retro",
    creator: "MAMADO arcade",
    description: "The 1976 classic, re-compiled for your neural cache. Eat, grow, don't bite yourself.",
    kind: "built-in",
    year: "1976",
  },
  {
    id: "breakout",
    title: "BRICKFALL",
    category: "arcade",
    creator: "MAMADO arcade",
    description: "Break every brick. One paddle, one ball, zero mercy. Pong's cooler sibling.",
    kind: "built-in",
    year: "1976",
  },
  {
    id: "2048",
    title: "2048.EXE",
    category: "puzzle",
    creator: "MAMADO arcade",
    description: "Slide, merge, double. A quiet numbers puzzle for loud brains.",
    kind: "built-in",
    year: "2014",
  },
];

export const GAME_CATEGORIES: { id: "" | GameCategory; label: string }[] = [
  { id: "", label: "All" },
  { id: "retro", label: "Retro" },
  { id: "arcade", label: "Arcade" },
  { id: "puzzle", label: "Puzzle" },
  { id: "reflex", label: "Reflex" },
];

/* ── Local favorites / recently played (offline-friendly) ────────────── */

const FAV_KEY = "mamado.games.favorites";
const RECENT_KEY = "mamado.games.recent";

export function loadGameFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function saveGameFavorites(ids: string[]) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids));
  } catch {
    /* private mode */
  }
}

export function loadRecentGames(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function pushRecentGame(id: string) {
  try {
    const next = [id, ...loadRecentGames().filter((g) => g !== id)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

/** Persisted best scores per game. */
const SCORE_KEY = "mamado.games.scores";

export function loadGameScores(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SCORE_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function recordGameScore(id: string, score: number) {
  try {
    const all = loadGameScores();
    if (!all[id] || score > all[id]) {
      all[id] = score;
      localStorage.setItem(SCORE_KEY, JSON.stringify(all));
    }
  } catch {
    /* private mode */
  }
}
