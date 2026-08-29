/**
 * PlayerBar — persistent premium music player.
 *
 * Engines:
 *  • direct      → HTML5 <audio>: full custom controls (seek/volume/progress),
 *                  real loading/ready/playing/paused/error states.
 *  • spotify / … → official embed (ToS-compliant). "Play" opens the expanded
 *                  player which hosts the official iframe; minimize unmounts
 *                  it (stopping playback). An "Open in <provider>" action is
 *                  always offered for the genuine experience.
 *
 * Layers: mini bar (z-40) < expanded overlay (z-60) < modals (z-70).
 */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronUp,
  ExternalLink,
  Heart,
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { usePlayerStore } from "@/store/player";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { toggleTrackFavorite } from "@/services/music";
import { cn, fmtDuration } from "@/lib/utils";
import {
  spotifyEmbedUrl,
  spotifyEmbedHeight,
  scEmbedUrl,
  appleMusicEmbedUrl,
  appleMusicEmbedHeight,
} from "@/services/music-providers";
import { WaveformLoader } from "@/components/ui/CircleLoaders";

function Cover({ url, className }: { url?: string | null; className?: string }) {
  return url ? (
    <img src={url} alt="" loading="lazy" className={cn("size-10 shrink-0 rounded-lg border border-line object-cover", className)} />
  ) : (
    <div className={cn("dot-grid-sm flex size-10 shrink-0 items-center justify-center rounded-lg border border-line text-[var(--txt-faint)]", className)}>
      <Music2 size={15} />
    </div>
  );
}

const SOURCE_LABEL = { spotify: "SPOTIFY", soundcloud: "SOUNDCLOUD", direct: "DIRECT", applemusic: "APPLE MUSIC" } as const;

/** Volume slider with a filled track that always mirrors the real value. */
function VolumeSlider({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Volume"
      style={{ background: `linear-gradient(to right, var(--txt) ${pct}%, var(--line) ${pct}%)` }}
      className={cn(
        "h-1 cursor-pointer appearance-none rounded-full",
        "[&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--txt)] [&::-webkit-slider-thumb]:shadow-[0_0_8px_var(--glow)]",
        "[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--txt)]",
        className,
      )}
    />
  );
}

export function PlayerBar() {
  const s = usePlayerStore();
  const playerExpanded = useUIStore((st) => st.playerExpanded);
  const setPlayerExpanded = useUIStore((st) => st.setPlayerExpanded);
  const [queueOpen, setQueueOpen] = useState(false);
  const userId = useAuthStore((st) => st.sessionUserId);

  const current = useMemo(() => s.queue.find((t) => t.id === s.currentId) ?? null, [s.queue, s.currentId]);

  const isEmbed = current ? current.source !== "direct" : false;
  const embedSrc = useMemo(() => {
    if (!current || !isEmbed) return null;
    if (current.source === "spotify") return spotifyEmbedUrl(current.source_url) ?? undefined;
    if (current.source === "applemusic") return appleMusicEmbedUrl(current.source_url) ?? undefined;
    return scEmbedUrl(current.source_url, true);
  }, [current, isEmbed]);

  const fav = current ? s.favorites.has(current.id) : false;

  const onToggleFavorite = async () => {
    if (!current) return;
    s.toggleFavorite(current.id);
    if (userId) await toggleTrackFavorite(userId, current.id, !fav).catch(() => undefined);
  };

  if (!current) return null;

  const progressPct = s.duration > 0 ? (s.progress / s.duration) * 100 : 0;
  const VolIcon = s.muted || s.volume === 0 ? VolumeX : s.volume < 0.5 ? Volume1 : Volume2;
  const stateChip =
    s.playbackState === "loading" ? "LOADING" :
    s.playbackState === "error" ? "ERROR" :
    s.playbackState === "unsupported" ? "UNSUPPORTED" : null;

  return (
    <>
      {/* ══════════ Mini player (persistent) ══════════ */}
      <motion.div
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-3 bottom-[130px] z-40 md:inset-x-auto md:bottom-[88px] md:left-auto md:right-4 md:w-[420px]"
      >
        <div className="glass-strong glass-edge overflow-hidden rounded-2xl">
          {/* error strip — honest, with retry */}
          {s.playbackState === "error" || s.playbackState === "unsupported" ? (
            <div className="flex items-center gap-2 border-b border-line bg-[color-mix(in_srgb,var(--color-negative)_8%,transparent)] px-3 py-1.5">
              <AlertTriangle size={12} className="shrink-0 text-[var(--color-negative)]" />
              <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--color-negative)]">
                {s.playbackError ?? "Playback error."}
              </span>
              <button onClick={s.togglePlay} className="meta shrink-0 cursor-pointer text-[var(--txt-dim)] hover:text-[var(--txt)]">
                RETRY
              </button>
            </div>
          ) : null}

          {/* seek bar (direct audio) */}
          <div className="relative h-[3px] bg-[var(--line)]">
            <input
              type="range"
              min={0} max={Math.max(1, s.duration)} step={1}
              value={isEmbed ? 0 : s.progress}
              onChange={(e) => s.seek(Number(e.target.value))}
              disabled={isEmbed}
              aria-label="Seek"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none bg-transparent disabled:cursor-default [&::-webkit-slider-thumb]:hidden [&::-moz-range-thumb]:hidden"
            />
            <div className="pointer-events-none h-full bg-[var(--txt)] transition-[width] duration-150" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <button onClick={() => setPlayerExpanded(true)} aria-label="Expand player" className="relative shrink-0 cursor-pointer transition-transform active:scale-95">
              <Cover url={current.cover_url} />
            </button>
            <button onClick={() => setPlayerExpanded(true)} className="min-w-0 flex-1 cursor-pointer text-left">
              <p className="truncate text-[13px] font-medium text-[var(--txt)]">{current.title}</p>
              <p className="meta flex items-center gap-1.5 truncate normal-case tracking-normal">
                {current.artist}
                <span className="rounded border border-line px-1 text-[9px] tracking-widest">{SOURCE_LABEL[current.source]}</span>
                {stateChip ? <span className={cn("text-[9px] tracking-widest", stateChip === "ERROR" && "text-[var(--color-negative)]")}>{stateChip}</span> : null}
              </p>
            </button>

            {s.playbackState === "loading" ? (
              <WaveformLoader size={26} className="shrink-0 text-[var(--txt)]" />
            ) : (
              <button
                onClick={s.togglePlay}
                aria-label={s.isPlaying ? "Pause" : "Play"}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-[var(--panel2)] text-[var(--txt)] transition-all hover:border-[color-mix(in_srgb,var(--txt)_40%,var(--line))] active:scale-95"
              >
                {s.isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
              </button>
            )}
            <div className="hidden items-center gap-0.5 md:flex">
              <button onClick={s.prev} aria-label="Previous" className="cursor-pointer rounded-lg p-1.5 text-[var(--txt-faint)] transition-colors hover:text-[var(--txt)]">
                <SkipBack size={14} />
              </button>
              <button onClick={s.next} aria-label="Next" className="cursor-pointer rounded-lg p-1.5 text-[var(--txt-faint)] transition-colors hover:text-[var(--txt)]">
                <SkipForward size={14} />
              </button>
            </div>
            <button
              onClick={onToggleFavorite}
              aria-label="Favorite"
              className={cn("cursor-pointer rounded-lg p-1.5 transition-colors", fav ? "text-[var(--color-negative)]" : "text-[var(--txt-faint)] hover:text-[var(--txt)]")}
            >
              <Heart size={14} fill={fav ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => setQueueOpen(!queueOpen)}
              aria-label="Queue"
              className="hidden cursor-pointer rounded-lg p-1.5 text-[var(--txt-faint)] transition-colors hover:text-[var(--txt)] md:block"
            >
              <ListMusic size={15} />
            </button>
            <div className="hidden items-center gap-1.5 xl:flex">
              <button onClick={s.toggleMute} aria-label="Mute" className="cursor-pointer text-[var(--txt-faint)] transition-colors hover:text-[var(--txt)]">
                <VolIcon size={14} />
              </button>
              <VolumeSlider value={s.muted ? 0 : s.volume} onChange={(v) => s.setVolume(v)} className="w-16" />
            </div>

            {/* close — dismisses the floating player entirely */}
            <button
              onClick={() => { setQueueOpen(false); s.close(); }}
              aria-label="Close player"
              title="Close player"
              className="press cursor-pointer rounded-full border border-line bg-[var(--panel2)]/60 p-1.5 text-[var(--txt-faint)] transition-colors hover:border-[color-mix(in_srgb,var(--color-negative)_50%,var(--line))] hover:text-[var(--color-negative)]"
            >
              <X size={13} />
            </button>

          </div>
        </div>
      </motion.div>

      {/* ══════════ Queue popover (desktop, above mini bar) ══════════ */}
      <AnimatePresence>
        {queueOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="glass-strong glass-edge fixed bottom-[150px] right-4 z-50 hidden w-80 overflow-hidden rounded-xl md:block"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="meta">QUEUE — {s.queue.length} TRACKS</span>
              <button onClick={() => setQueueOpen(false)} className="cursor-pointer text-[var(--txt-faint)] hover:text-[var(--txt)]" aria-label="Close queue">
                <X size={13} />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5">
              {s.queue.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
                    t.id === current.id ? "bg-[var(--panel2)]" : "hover:bg-[var(--panel2)]",
                  )}
                >
                  <Cover url={t.cover_url} className="size-8" />
                  <button onClick={() => s.playTrack(t, s.queue)} className="min-w-0 flex-1 cursor-pointer text-left">
                    <p className={cn("truncate text-xs", t.id === current.id ? "text-[var(--txt)]" : "text-[var(--txt-dim)]")}>
                      {t.title}
                    </p>
                    <p className="meta truncate normal-case">{t.artist}</p>
                  </button>
                  <button
                    onClick={() => s.removeFromQueue(t.id)}
                    aria-label="Remove from queue"
                    className="cursor-pointer p-1 text-[var(--txt-faint)] opacity-0 transition-opacity hover:text-[var(--color-negative)] group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ══════════ Expanded player (all sizes) ══════════ */}
      <AnimatePresence>
        {playerExpanded ? (
          <ExpandedPlayer
            embedSrc={embedSrc}
            embedHeight={
              current.source === "spotify"
                ? spotifyEmbedHeight(current.source_url)
                : current.source === "applemusic"
                  ? appleMusicEmbedHeight(current.source_url)
                  : 180
            }
            sourceUrl={current.source_url}
            onMinimize={() => setPlayerExpanded(false)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** Large elegant player view — hosts the official embed when needed. */
function ExpandedPlayer({
  embedSrc,
  embedHeight,
  sourceUrl,
  onMinimize,
}: {
  embedSrc: string | null | undefined;
  embedHeight: number;
  sourceUrl: string;
  onMinimize: () => void;
}) {
  const s = usePlayerStore();
  const current = s.queue.find((t) => t.id === s.currentId) ?? null;
  const isEmbed = current ? current.source !== "direct" : false;
  const [queueOpen, setQueueOpen] = useState(false);
  const progressPct = s.duration > 0 ? (s.progress / s.duration) * 100 : 0;
  const VolIcon = s.muted || s.volume === 0 ? VolumeX : s.volume < 0.5 ? Volume1 : Volume2;
  const fav = current ? s.favorites.has(current.id) : false;

  const onToggleFavoriteExpanded = () => {
    if (!current) return;
    s.toggleFavorite(current.id);
    void toggleTrackFavorite(useAuthStore.getState().sessionUserId ?? "", current.id, !fav).catch(() => undefined);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMinimize();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMinimize]);

  if (!current) return null;

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0.6 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0.4 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      className="dot-grid fixed inset-0 z-[60] flex flex-col bg-[var(--bg)]"
      style={{
        backgroundImage:
          "radial-gradient(900px 420px at 50% -8%, color-mix(in srgb, var(--txt) 6%, transparent), transparent 70%)",
      }}
      role="dialog"
      aria-label="Music player"
    >
      <div className="flex items-center justify-between px-5 pt-5">
        <span className="meta">NOW PLAYING</span>
        <div className="flex items-center gap-2">
          <span className="meta rounded border border-line px-2 py-0.5">{SOURCE_LABEL[current.source]}</span>
          {s.playbackState === "loading" ? <span className="meta text-[var(--txt-dim)]">LOADING…</span> : null}
          {s.playbackError ? <span className="meta text-[var(--color-negative)]">{s.playbackError}</span> : null}
          <button onClick={onMinimize} aria-label="Minimize" className="cursor-pointer rounded-full border border-line p-2 text-[var(--txt-dim)] transition-colors hover:text-[var(--txt)]">
            <ChevronUp size={16} className="rotate-180" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-8">
        {current.cover_url ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={current.cover_url}
              src={current.cover_url}
              alt=""
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="size-44 rounded-2xl border border-line object-cover shadow-[0_0_80px_var(--glow)] md:size-52"
            />
          </AnimatePresence>
        ) : (
          <div className="dot-grid flex size-44 items-center justify-center rounded-2xl border border-line text-[var(--txt-faint)] md:size-52">
            <Music2 size={40} />
          </div>
        )}
        <div className="text-center">
          <p className="display text-lg tracking-wide text-[var(--txt)]">{current.title}</p>
          <p className="mt-1 text-sm text-[var(--txt-dim)]">{current.artist}</p>
          {current.album ? <p className="meta mt-1 normal-case tracking-normal">{current.album}</p> : null}
        </div>

        {isEmbed ? (
          embedSrc ? (
            <div className="w-full max-w-lg">
              {/* official provider player — ToS-compliant playback */}
              <iframe
                key={embedSrc}
                title={`Official ${current.source} player`}
                src={embedSrc}
                width="100%"
                height={embedHeight}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                style={{ border: 0 }}
                className="rounded-xl border border-line"
              />
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="meta mt-2 flex items-center justify-center gap-1.5 hover:text-[var(--txt-dim)]">
                <ExternalLink size={11} /> OPEN IN OFFICIAL {current.source === "applemusic" ? "APPLE MUSIC" : current.source.toUpperCase()} APP
              </a>
            </div>
          ) : (
            <p className="meta max-w-64 text-center leading-relaxed">
              THIS {(current.source === "applemusic" ? "APPLE MUSIC" : current.source.toUpperCase())} LINK CAN'T BE EMBEDDED — USE THE OFFICIAL APP
            </p>
          )
        ) : (
          <div className="w-full max-w-80">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
              <input
                type="range"
                min={0} max={Math.max(1, s.duration)} step={1}
                value={s.progress}
                onChange={(e) => s.seek(Number(e.target.value))}
                aria-label="Seek"
                className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-transparent"
              />
              <div className="pointer-events-none h-full bg-[var(--txt)] transition-[width] duration-150" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="meta mt-2 flex justify-between">
              <span>{fmtDuration(s.progress)}</span>
              <span>{s.duration > 0 ? fmtDuration(s.duration) : "—"}</span>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button onClick={s.toggleMute} aria-label="Mute" className="cursor-pointer text-[var(--txt-faint)] transition-colors hover:text-[var(--txt)]">
                <VolIcon size={16} />
              </button>
              <VolumeSlider value={s.muted ? 0 : s.volume} onChange={(v) => s.setVolume(v)} className="w-32" />
            </div>
          </div>
        )}


        {/* queue — 7th control target, toggled from the control row */}
        {queueOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel w-full max-w-lg rounded-2xl p-3"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="meta">QUEUE — {s.queue.length} TRACKS</p>
              <button onClick={() => setQueueOpen(false)} aria-label="Close queue" className="cursor-pointer text-[var(--txt-faint)] hover:text-[var(--txt)]">
                <X size={13} />
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {s.queue.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
                    t.id === current.id ? "bg-[var(--panel2)]" : "hover:bg-[var(--panel2)]/60",
                  )}
                >
                  <button onClick={() => s.playTrack(t, s.queue)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left">
                    <Cover url={t.cover_url} className="size-8" />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-xs", t.id === current.id ? "text-[var(--txt)]" : "text-[var(--txt-dim)]")}>{t.title}</span>
                      <span className="meta block truncate normal-case">{t.artist}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => s.removeFromQueue(t.id)}
                    aria-label="Remove from queue"
                    className="cursor-pointer p-1 text-[var(--txt-faint)] transition-colors hover:text-[var(--color-negative)]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}

      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 pb-10 pt-2 md:gap-5">
        {/* 7th control — queue */}
        <button
          onClick={() => setQueueOpen((q) => !q)}
          aria-label="Queue"
          className={cn("press cursor-pointer p-2 transition-colors", queueOpen ? "text-[var(--txt)]" : "text-[var(--txt-faint)] hover:text-[var(--txt-dim)]")}
        >
          <ListMusic size={17} />
        </button>
        <button onClick={s.toggleShuffle} aria-label="Shuffle" className={cn("press cursor-pointer p-2 transition-colors", s.shuffle ? "text-[var(--txt)]" : "text-[var(--txt-faint)] hover:text-[var(--txt-dim)]")}>
          <Shuffle size={17} />
        </button>
        <button onClick={s.prev} aria-label="Previous" className="cursor-pointer p-2 text-[var(--txt)]">
          <SkipBack size={22} />
        </button>
        <button
          onClick={s.togglePlay}
          aria-label={s.isPlaying ? "Pause" : "Play"}
          className="flex size-14 cursor-pointer items-center justify-center rounded-full border border-line bg-[var(--panel2)] text-[var(--txt)] transition-all hover:border-[color-mix(in_srgb,var(--txt)_45%,var(--line))] hover:shadow-[0_0_30px_var(--glow)] active:scale-95"
        >
          {s.isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
        </button>
        <button onClick={s.next} aria-label="Next" className="cursor-pointer p-2 text-[var(--txt)]">
          <SkipForward size={22} />
        </button>
        <button onClick={s.cycleRepeat} aria-label="Repeat" className={cn("cursor-pointer p-2 transition-colors", s.repeat !== "off" ? "text-[var(--txt)]" : "text-[var(--txt-faint)] hover:text-[var(--txt-dim)]")}>
          {s.repeat === "one" ? <Repeat1 size={17} /> : <Repeat size={17} />}
        </button>
        <button
          onClick={onToggleFavoriteExpanded}
          aria-label="Favorite"
          className={cn("cursor-pointer p-2 transition-colors", fav ? "text-[var(--color-negative)]" : "text-[var(--txt-faint)] hover:text-[var(--txt)]")}
        >
          <Heart size={17} fill={fav ? "currentColor" : "none"} />
        </button>
      </div>
    </motion.div>
  );
}


