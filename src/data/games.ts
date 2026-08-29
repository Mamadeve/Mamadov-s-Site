/**
 * Games catalog — a small futuristic retro-arcade.
 *
 * `built-in` titles are first-party HTML5 games implemented inside MAMADO
 * (no third-party licensing or embedding concerns, fully offline-capable).
 *
 * `embed` entries are officially-provided play URLs that explicitly permit
 * iframe embedding (no X-Frame-Options / frame-ancestors blocking).
 *
 * `external` entries are games whose providers BLOCK cross-site embedding
 * (e.g. CrazyGames sends X-Frame-Options / CSP frame-ancestors headers).
 * These are NEVER loaded in an iframe — the Arcade opens a Liquid Glass
 * launch window inside the app and the provider page opens in a new tab.
 * We do not bypass any provider security headers.
 */
export type GameCategory = "arcade" | "puzzle" | "retro" | "reflex";

export interface GameEntry {
  id: string;
  title: string;
  category: GameCategory;
  creator: string;
  description: string;
  kind: "built-in" | "embed" | "external";
  /** For embed kind: official play/embed URL (permits framing).
   *  For external kind: the official game page URL (opened in a new tab). */
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
  /* ── CrazyGames catalogue ───────────────────────────────────────────────
   * CrazyGames does NOT allow its pages to be embedded in iframes on other
   * sites (X-Frame-Options / CSP). These are integrated legitimately as
   * `external` entries: the Arcade shows an in-app Liquid Glass launch
   * window and the game opens on crazygames.com in a new browser tab. */
  {
    id: "cg-electron-dash",
    title: "ELECTRON DASH",
    category: "reflex",
    creator: "CrazyGames",
    description: "Sprint across a neon space tube, dodge barriers and don't fall off the edge of the galaxy.",
    kind: "external",
    url: "https://www.crazygames.com/game/electron-dash",
    year: "2021",
  },
  {
    id: "cg-smash-karts",
    title: "SMASH KARTS",
    category: "arcade",
    creator: "CrazyGames",
    description: "Explosive 3D kart arena battles. Pick up power-ups and blow the lobby away.",
    kind: "external",
    url: "https://www.crazygames.com/game/smash-karts",
    year: "2020",
  },
  {
    id: "cg-drift-boss",
    title: "DRIFT BOSS",
    category: "reflex",
    creator: "CrazyGames",
    description: "One button. Endless corners. Drift the hairpins and survive the narrow road.",
    kind: "external",
    url: "https://www.crazygames.com/game/drift-boss",
    year: "2019",
  },
  {
    id: "cg-retro-bowl",
    title: "RETRO BOWL",
    category: "arcade",
    creator: "CrazyGames",
    description: "Manage your franchise and throw pixel-perfect passes in this beloved retro football hit.",
    kind: "external",
    url: "https://www.crazygames.com/game/retro-bowl",
    year: "2017",
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
