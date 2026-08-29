/**
 * GamesPage — a small futuristic retro-arcade inside the productivity OS.
 * Gallery (search / filters / favorites / recently played) + immersive
 * player view with fullscreen, exit and loading states.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Gamepad2, Heart, Maximize, Play, Search, X } from "lucide-react";
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

/** Retro procedural cover (no external assets) with a glass tint + provider chip. */
function GameCover({ game, className }: { game: GameEntry; className?: string }) {
  const hue = [...game.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 4;
  const glyphs = ["▚", "▞", "◆", "⬡"];
  return (
    <div className={cn("dot-grid-sm relative flex items-center justify-center overflow-hidden rounded-xl border border-line", className)}>
      <div
        aria-hidden
        className="absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(140px 90px at 28% 18%, color-mix(in srgb, var(--txt) 9%, transparent), transparent 72%), radial-gradient(120px 90px at 85% 90%, color-mix(in srgb, var(--txt) 6%, transparent), transparent 70%)",
        }}
      />
      <span className="relative select-none font-mono text-3xl text-[var(--txt-faint)] transition-transform duration-300 group-hover:scale-110">{glyphs[hue]}</span>
      <span className="meta absolute bottom-1.5 right-2">{game.year}</span>
      <span className="meta absolute left-2 top-1.5 rounded border border-line bg-[var(--panel)]/70 px-1 py-px text-[8px] backdrop-blur-sm">
        {game.kind === "built-in" ? "1ST PARTY" : game.kind === "embed" ? "EMBED" : "CRAZYGAMES"}
      </span>
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
  /* external games (CrazyGames blocks iframes) open via the launch window */
  const [launching, setLaunching] = useState<GameEntry | null>(null);
  /* generic embed health tracking — automatic external fallback on failure */
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      saveGameFavorites(next);
      return next;
    });
  };

  const openGame = (g: GameEntry) => {
    pushRecentGame(g.id);
    setRecent(loadRecentGames());
    /* external providers (e.g. CrazyGames) block cross-site iframe embedding
       via X-Frame-Options/CSP — open our Liquid Glass launch window instead
       and let the provider page open in a new tab. Never fight their headers. */
    if (g.kind === "external") {
      setLaunching(g);
      return;
    }
    setPlaying(g);
    setLoadingGame(true);
  };

  const closeGame = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    setPlaying(null);
    setEmbedLoaded(false);
    setEmbedFailed(false);
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

  /* cabinet warm-up loading state — built-ins warm up on a timer;
     embeds wait for the real iframe onLoad */
  useEffect(() => {
    if (!playing || !loadingGame) return;
    if (playing.kind === "embed") return;
    const t = setTimeout(() => setLoadingGame(false), 450);
    return () => clearTimeout(t);
  }, [playing, loadingGame]);

  /* embed failure detection — if an officially-embeddable game never fires
     onLoad, fall back to the external Play Game window automatically */
  useEffect(() => {
    if (playing?.kind !== "embed") return;
    setEmbedLoaded(false);
    setEmbedFailed(false);
    const t = setTimeout(() => {
      if (!embedLoaded) setEmbedFailed(true);
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

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
            <Heart size={12} fill={showFavorites ? "currentColor" : "none"} /> Favorites
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
              className="card-surface glow-hover glass-sheen group flex flex-col p-4 transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="relative mb-3">
                <GameCover game={g} className="h-28 w-full" />
                {/* hover play overlay */}
                <button
                  onClick={() => openGame(g)}
                  aria-label={`Play ${g.title}`}
                  className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-xl bg-black/45 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100"
                >
                  <span className="press flex size-11 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--txt)_35%,transparent)] bg-[var(--panel)]/90 text-[var(--txt)] shadow-[0_0_24px_var(--glow)]">
                    <Play size={16} className="ml-0.5" />
                  </span>
                </button>
              </div>
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
            style={{
              backgroundImage:
                "radial-gradient(1000px 460px at 50% -10%, color-mix(in srgb, var(--txt) 6%, transparent), transparent 70%)",
            }}
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
            <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
              {loadingGame ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg)]/75 backdrop-blur-sm">
                  <LatitudeLoader size={72} label="WARMING UP THE CABINET" />
                </div>
              ) : null}
              {playing.kind === "built-in" ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  {renderGame(playing.id, handleScore)}
                </motion.div>
              ) : playing.url ? (
                /* iframe is ONLY used for providers that explicitly permit
                   framing. If the embed never loads (blocked / offline), we
                   automatically swap to the external Play Game fallback. */
                embedFailed ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel glass-sheen flex max-w-sm flex-col items-center gap-3 rounded-2xl p-6 text-center"
                  >
                    <GameCover game={playing} className="h-24 w-40" />
                    <p className="text-[13px] font-medium text-[var(--txt)]">{playing.title}</p>
                    <p className="text-xs leading-relaxed text-[var(--txt-dim)]">
                      This game can't be displayed inside the app — the provider doesn't allow embedding.
                    </p>
                    <Button variant="primary" onClick={() => window.open(playing.url, "_blank", "noopener,noreferrer")}>
                      <ExternalLink size={13} /> Play Game in new tab
                    </Button>
                  </motion.div>
                ) : (
                  <iframe
                    src={playing.url}
                    title={playing.title}
                    sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-popups-to-escape-sandbox"
                    allow="fullscreen; gamepad; autoplay"
                    onLoad={() => { setLoadingGame(false); setEmbedLoaded(true); }}
                    className="h-full w-full rounded-xl border border-line"
                  />
                )
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── Liquid Glass launch window for external games (CrazyGames) ── */}
      <GameLaunchModal
        game={launching}
        bestScore={launching ? scores[launching.id] : undefined}
        onClose={() => setLaunching(null)}
      />

    </div>
  );
}

/**
 * GameLaunchModal — in-site Liquid Glass launch window for external games.
 *
 * CrazyGames (and similar providers) block cross-site iframe embedding via
 * X-Frame-Options / CSP frame-ancestors. Instead of iframing their pages
 * (which triggers browser security errors), this window presents the game
 * beautifully inside the app and the actual game opens on the provider's
 * site in a NEW browser tab when the user presses Play Game.
 */
function GameLaunchModal({
  game,
  bestScore,
  onClose,
}: {
  game: GameEntry | null;
  bestScore?: number;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!game) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [game, onClose]);

  if (typeof document === "undefined") return null;

  const play = () => {
    if (!game?.url) return;
    window.open(game.url, "_blank", "noopener,noreferrer");
  };

  return createPortal(
    <AnimatePresence>
      {game ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[6px]" onClick={onClose} aria-hidden />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${game.title} launch window`}
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.9 }}
            className="glass-panel glass-sheen relative z-10 flex w-full flex-col overflow-hidden rounded-t-3xl sm:max-w-md sm:rounded-3xl"
          >
            {/* header row */}
            <div className="relative flex items-start justify-between gap-3 px-5 pt-4">
              <div className="flex items-center gap-2">
                <span className="meta rounded border border-line bg-[var(--panel)]/70 px-1.5 py-px">CRAZYGAMES</span>
                {bestScore ? <span className="meta">BEST {bestScore}</span> : null}
              </div>
              <button
                onClick={onClose}
                aria-label="Close launch window"
                className="press cursor-pointer rounded-full border border-line bg-[var(--panel2)]/60 p-1.5 text-[var(--txt-faint)] transition-colors hover:text-[var(--txt)]"
              >
                <X size={14} />
              </button>
            </div>

            {/* thumbnail */}
            <div className="px-5 pt-4">
              <div className="group relative">
                <GameCover game={game} className="h-44 w-full rounded-2xl" />
                <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_var(--glass-highlight)]" />
              </div>
            </div>

            {/* meta */}
            <div className="flex flex-col gap-2 px-5 pt-4">
              <h3 className="display text-lg tracking-wide text-[var(--txt)]">{game.title}</h3>
              <p className="meta normal-case tracking-normal">{game.category.toUpperCase()} · {game.creator} · {game.year}</p>
              {game.description ? (
                <p className="text-xs leading-relaxed text-[var(--txt-dim)]">{game.description}</p>
              ) : null}
              <p className="text-[11px] leading-relaxed text-[var(--txt-faint)]">
                This game runs on crazygames.com — it opens in a new browser tab so you always get the
                official, full experience.
              </p>
            </div>

            {/* actions */}
            <div className="flex items-center gap-2 px-5 pb-5 pt-5">
              <Button variant="primary" size="md" className="flex-1" onClick={play}>
                <Play size={14} /> Play Game
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

