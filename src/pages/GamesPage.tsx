/**
 * GamesPage — a small futuristic retro-arcade inside the productivity OS.
 * Gallery (search / filters / favorites / recently played) + immersive
 * player view with fullscreen, exit and loading states.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gamepad2, Heart, Maximize, Play, Search, X } from "lucide-react";
import {
  GAMES,
  GAME_CATEGORIES,
  loadGameFavorites,
  loadRecentGames,
  loadGameScores,
  pushRecentGame,
  saveGameFavorites,
  type GameEntry,
} from "@/data/games";
import { SnakeGame } from "@/components/games/SnakeGame";
import { BreakoutGame } from "@/components/games/BreakoutGame";
import { Game2048 } from "@/components/games/Game2048";
import { Button, Input, Select } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/bits";
import { LatitudeLoader } from "@/components/ui/CircleLoaders";
import { cn } from "@/lib/utils";

/** Retro procedural cover (no external assets). */
function GameCover({ game, className }: { game: GameEntry; className?: string }) {
  const hue = [...game.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 4;
  const glyphs = ["▚", "▞", "◆", "⬡"];
  return (
    <div className={cn("dot-grid-sm relative flex items-center justify-center overflow-hidden rounded-xl border border-line", className)}>
      <span className="select-none font-mono text-3xl text-[var(--txt-faint)]">{glyphs[hue]}</span>
      <span className="meta absolute bottom-1.5 right-2">{game.year}</span>
    </div>
  );
}

function renderGame(id: string, onScore: (s: number) => void) {
  switch (id) {
    case "snake": return <SnakeGame onScore={onScore} />;
    case "breakout": return <BreakoutGame onScore={onScore} />;
    case "2048": return <Game2048 onScore={onScore} />;
    default: return null;
  }
}

export default function GamesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => loadGameFavorites());
  const [recent, setRecent] = useState<string[]>(() => loadRecentGames());
  const [scores, setScores] = useState<Record<string, number>>(() => loadGameScores());
  const [playing, setPlaying] = useState<GameEntry | null>(null);
  const [loadingGame, setLoadingGame] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      saveGameFavorites(next);
      return next;
    });
  };

  const openGame = (g: GameEntry) => {
    setPlaying(g);
    setLoadingGame(true);
    pushRecentGame(g.id);
    setRecent(loadRecentGames());
  };

  const closeGame = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    setPlaying(null);
    setScores(loadGameScores());
  };

  const fullscreen = () => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void el.requestFullscreen().catch(() => undefined);
  };

  const handleScore = (s: number) => {
    if (!playing) return;
    setScores((prev) => ({ ...prev, [playing.id]: Math.max(prev[playing.id] ?? 0, s) }));
  };

  /* immersive-view: Escape exits (unless the game itself is fullscreen) */
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) closeGame();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  /* cabinet warm-up loading state */
  useEffect(() => {
    if (!playing || !loadingGame) return;
    const t = setTimeout(() => setLoadingGame(false), 450);
    return () => clearTimeout(t);
  }, [playing, loadingGame]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GAMES.filter((g) => {
      if (category && g.category !== category) return false;
      if (showFavorites && !favorites.includes(g.id)) return false;
      if (q && !(g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [search, category, showFavorites, favorites]);

  const recentGames = recent.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean) as GameEntry[];

  return (
    <div className="animate-rise">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-2xl tracking-wide text-[var(--txt)]">ARCADE</h1>
          <p className="meta mt-1">{GAMES.length} CARTRIDGES INSERTED · {favorites.length} FAVORITES</p>
        </div>
      </div>

      {/* toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--txt-faint)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search games…" className="pl-8" aria-label="Search games" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-28" aria-label="Filter by category">
            {GAME_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
          <Button variant={showFavorites ? "outline" : "ghost"} size="sm" className="h-9 border-line" onClick={() => setShowFavorites((f) => !f)}>
            <Heart size={12} fill={showFavorites ? "currentColor" : "none"} /> Faves
          </Button>
        </div>
      </div>

      {/* recently played */}
      {recentGames.length > 0 && !playing ? (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Gamepad2 size={14} className="text-[var(--txt-faint)]" />
            <span className="meta">RECENTLY PLAYED</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentGames.map((g) => (
              <button key={g.id} onClick={() => openGame(g)} className="group w-36 shrink-0 cursor-pointer text-left">
                <GameCover game={g} className="mb-2 h-20 w-full transition-all group-hover:border-[color-mix(in_srgb,var(--txt)_30%,var(--line))]" />
                <p className="truncate text-xs text-[var(--txt)]">{g.title}</p>
                {scores[g.id] ? <p className="meta">BEST {scores[g.id]}</p> : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* gallery */}
      {visible.length === 0 ? (
        <EmptyState
          icon={<Gamepad2 size={16} />}
          title="NO CARTRIDGES FOUND"
          description="Try a different search, category, or clear the favorites filter."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((g, i) => (
            <motion.article
              key={g.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="card-surface glow-hover group flex flex-col p-4"
            >
              <GameCover game={g} className="mb-3 h-28 w-full" />
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="display text-sm tracking-wider text-[var(--txt)]">{g.title}</h3>
                <button
                  onClick={() => toggleFav(g.id)}
                  aria-label="Favorite"
                  className={cn(
                    "cursor-pointer rounded-lg p-1 transition-colors",
                    favorites.includes(g.id) ? "text-[var(--color-negative)]" : "text-[var(--txt-faint)] hover:text-[var(--txt)]",
                  )}
                >
                  <Heart size={13} fill={favorites.includes(g.id) ? "currentColor" : "none"} />
                </button>
              </div>
              <p className="meta mb-2">{g.category.toUpperCase()} · {g.creator}</p>
              <p className="mb-4 flex-1 text-xs leading-relaxed text-[var(--txt-dim)]">{g.description}</p>
              <div className="flex items-center justify-between">
                {scores[g.id] ? <span className="meta">BEST {scores[g.id]}</span> : <span className="meta">NO SCORE YET</span>}
                <Button size="sm" variant="outline" onClick={() => openGame(g)}>
                  <Play size={12} /> Play
                </Button>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {/* ── Immersive player view ── */}
      <AnimatePresence>
        {playing ? (
          <motion.div
            ref={shellRef}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="dot-grid fixed inset-0 z-[80] flex flex-col bg-[var(--bg)]"
            role="dialog"
            aria-label={`${playing.title} player`}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-3">
                <button onClick={closeGame} aria-label="Back to arcade" className="cursor-pointer rounded-lg border border-line p-2 text-[var(--txt-dim)] transition-colors hover:text-[var(--txt)]">
                  <X size={14} />
                </button>
                <div>
                  <p className="display text-sm tracking-wider text-[var(--txt)]">{playing.title}</p>
                  <p className="meta">{playing.category.toUpperCase()} · {playing.creator}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {scores[playing.id] ? <span className="meta hidden sm:block">BEST {scores[playing.id]}</span> : null}
                <Button size="sm" variant="outline" onClick={fullscreen}>
                  <Maximize size={12} /> Fullscreen
                </Button>
                <Button size="sm" variant="ghost" onClick={closeGame}>
                  Exit
                </Button>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto p-4">
              {loadingGame ? (
                <LatitudeLoader size={72} label="WARMING UP THE CABINET" />
              ) : playing.kind === "built-in" ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  {renderGame(playing.id, handleScore)}
                </motion.div>
              ) : playing.url ? (
                <iframe
                  src={playing.url}
                  title={playing.title}
                  sandbox="allow-scripts allow-same-origin allow-pointer-lock"
                  allow="fullscreen; gamepad"
                  className="h-full w-full rounded-xl border border-line"
                />
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>


    </div>
  );
}

