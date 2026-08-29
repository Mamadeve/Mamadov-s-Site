/**
 * TrackRow — music library row: cover, title/artist, source badge, controls.
 * The three-dot menu uses a portal Popover so it can never be clipped or
 * hidden behind the header, and flips near viewport edges.
 */
import { motion } from "framer-motion";
import { Clock, Heart, MoreHorizontal, Music2, Pause, Play, Trash2, Pencil, ExternalLink } from "lucide-react";
import { useRef, useState } from "react";
import type { TrackWithMeta } from "@/types/database";
import { usePlayerStore } from "@/store/player";
import { useAuthStore } from "@/store/auth";
import { toggleTrackFavorite } from "@/services/music";
import { cn, timeAgo } from "@/lib/utils";
import { Popover } from "@/components/ui/Popover";

const sourceLabel = { spotify: "SPOTIFY", soundcloud: "SOUNDCLOUD", direct: "DIRECT", applemusic: "APPLE MUSIC" } as const;

export function TrackRow({
  track,
  queue,
  onEdit,
  onRemove,
}: {
  track: TrackWithMeta;
  queue: TrackWithMeta[];
  onEdit?: (t: TrackWithMeta) => void;
  onRemove?: (t: TrackWithMeta) => void;
}) {
  const player = usePlayerStore();
  const userId = useAuthStore((s) => s.sessionUserId);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);
  const isCurrent = player.currentId === track.id;
  const isFav = player.favorites.has(track.id);

  const play = () => {
    if (isCurrent) player.togglePlay();
    else player.playTrack(track, queue);
  };

  const onFavorite = async () => {
    player.toggleFavorite(track.id);
    if (userId) {
      await toggleTrackFavorite(userId, track.id, !player.favorites.has(track.id)).catch(() => undefined);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors",
        "hover:border-line hover:bg-[var(--panel2)]/60",
        isCurrent && "border-line bg-[var(--panel2)]",
      )}
    >
      {/* cover / play */}
      <div className="relative shrink-0">
        {track.cover_url ? (
          <img src={track.cover_url} alt="" loading="lazy" className="size-11 rounded-lg border border-line object-cover" />
        ) : (
          <div className="dot-grid-sm flex size-11 items-center justify-center rounded-lg border border-line text-[var(--txt-faint)]">
            <Music2 size={15} />
          </div>
        )}
        <button
          onClick={play}
          aria-label={isCurrent && player.isPlaying ? "Pause" : "Play"}
          className={cn(
            "absolute inset-0 flex cursor-pointer items-center justify-center rounded-lg transition-all active:scale-95",
            "bg-black/60 text-[var(--txt)] opacity-0 backdrop-blur-[2px] group-hover:opacity-100",
            (isCurrent && player.isPlaying) && "opacity-100",
          )}
        >
          {isCurrent && player.isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
        </button>
      </div>

      {/* title / artist */}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[13px] font-medium", isCurrent ? "text-[var(--txt)]" : "text-[var(--txt-dim)]")}>
          {track.title}
        </p>
        <p className="meta flex items-center gap-2 truncate normal-case tracking-normal">
          {track.artist}
          {track.status === "pending" ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-caution)_40%,var(--line))] px-1.5 py-px text-[9px] uppercase tracking-widest text-[var(--color-caution)]">
              <Clock size={8} /> pending review
            </span>
          ) : null}
          {track.status === "rejected" ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-negative)_40%,var(--line))] px-1.5 py-px text-[9px] uppercase tracking-widest text-[var(--color-negative)]">
              rejected
            </span>
          ) : null}
        </p>
      </div>

      {/* category */}
      {track.category ? (
        <span className="hidden items-center gap-1.5 text-xs text-[var(--txt-faint)] lg:flex">
          <span className="size-1.5 rounded-full" style={{ background: track.category.color ?? "var(--txt-faint)" }} />
          {track.category.name}
        </span>
      ) : null}

      {/* source + added */}
      <span className="meta hidden w-28 md:block">{sourceLabel[track.source]}</span>
      <span className="meta hidden w-24 text-right lg:block">{timeAgo(track.created_at)}</span>

      {/* favorite */}
      <button
        onClick={() => void onFavorite()}
        aria-label="Favorite"
        className={cn(
          "cursor-pointer rounded-lg p-1.5 transition-colors",
          isFav ? "text-[var(--color-negative)]" : "text-[var(--txt-faint)] hover:text-[var(--txt)]",
        )}
      >
        <Heart size={13} fill={isFav ? "currentColor" : "none"} />
      </button>

      {/* menu — portal popover: never clipped, flips at viewport edges */}
      <button
        ref={menuAnchorRef}
        onClick={() => setMenuOpen((m) => !m)}
        aria-label="More"
        className="cursor-pointer rounded-lg p-1.5 text-[var(--txt-faint)] transition-colors hover:bg-[var(--panel2)] hover:text-[var(--txt)]"
      >
        <MoreHorizontal size={14} />
      </button>
      <Popover open={menuOpen} onClose={() => setMenuOpen(false)} anchor={menuAnchorRef.current} width={176}>
        {onEdit ? (
          <button
            onClick={() => { setMenuOpen(false); onEdit(track); }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[var(--txt-dim)] hover:bg-[var(--panel2)] hover:text-[var(--txt)]"
          >
            <Pencil size={12} /> Edit
          </button>
        ) : null}
        {onRemove ? (
          <button
            onClick={() => { setMenuOpen(false); onRemove(track); }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[var(--color-negative)] hover:bg-[color-mix(in_srgb,var(--color-negative)_8%,transparent)]"
          >
            <Trash2 size={12} /> Remove
          </button>
        ) : null}
        <a
          href={track.source_url}
          target="_blank"
          rel="noreferrer"
          onClick={() => setMenuOpen(false)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[var(--txt-dim)] hover:bg-[var(--panel2)] hover:text-[var(--txt)]"
        >
          <ExternalLink size={12} /> Open source
        </a>
      </Popover>

    </motion.div>
  );
}
