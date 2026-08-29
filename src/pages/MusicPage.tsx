/**
 * MusicPage — shared music library with search, filter, recently played,
 * queue and the persistent player.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Disc3, Music2, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { TrackWithMeta } from "@/types/database";
import { listTracks, deleteTrack, listRecentlyPlayed } from "@/services/music";
import { useAuthStore, useToast, usePlayerStore } from "@/store";
import { dbErrorMessage } from "@/lib/supabase";
import { useDebounce } from "@/hooks/useMisc";
import { useDataSync } from "@/hooks/useDataSync";
import { TrackRow } from "@/components/music/TrackRow";
import { AddMusicModal } from "@/components/music/AddMusicModal";
import { Button, Input, Select } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/bits";
import { WaveformLoader } from "@/components/ui/CircleLoaders";
import { cn } from "@/lib/utils";

export default function MusicPage() {
  const profile = useAuthStore((s) => s.profile);
  const toast = useToast();
  const player = usePlayerStore();
  const [tracks, setTracks] = useState<TrackWithMeta[]>([]);
  const [recent, setRecent] = useState<TrackWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TrackWithMeta | null>(null);
  const recentLoadedRef = useRef(false);

  const debouncedSearch = useDebounce(search, 250);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await listTracks({
        userId: profile.id,
        search: debouncedSearch,
        source: source || undefined,
        favoritesOnly: showFavorites,
      });
      setTracks(data);
      if (!recentLoadedRef.current) {
        recentLoadedRef.current = true;
        const rp = await listRecentlyPlayed(profile.id).catch(() => []);
        setRecent(rp);
      }
    } catch (e) {
      toast({ title: "Couldn't load library", description: dbErrorMessage(e as never), variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [profile, debouncedSearch, source, showFavorites, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  /* data sync — realtime from other users + instant local updates (no refresh) */
  useDataSync("music_tracks", () => void load());

  const remove = async (t: TrackWithMeta) => {
    try {
      await deleteTrack(t.id);
      setTracks((prev) => prev.filter((x) => x.id !== t.id));
      toast({ title: "Track removed", description: t.title });
    } catch (e) {
      toast({ title: "Couldn't remove track", description: dbErrorMessage(e as never), variant: "error" });
    }
  };

  return (
    <div className="animate-rise">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-2xl tracking-wide text-[var(--txt)]">MUSIC</h1>
          <p className="meta mt-1">{tracks.length} TRACKS IN LIBRARY</p>
        </div>
        <Button variant="outline" onClick={() => { setEditing(null); setModalOpen(true); }} className="h-[38px] rounded-[10px] px-4 text-[13px]">
          <Plus size={14} /> Add music
        </Button>
      </div>

      {/* toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--txt-faint)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search music…" className="pl-8" aria-label="Search music" />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={13} className="text-[var(--txt-faint)]" />
          <Select value={source} onChange={(e) => setSource(e.target.value)} className="w-32" aria-label="Filter by source">
            <option value="">All sources</option>
            <option value="spotify">Spotify</option>
            <option value="soundcloud">SoundCloud</option>
            <option value="direct">Direct</option>
          </Select>
          <button
            onClick={() => setShowFavorites((f) => !f)}
            aria-label="Favorites only"
            className={cn(
              "cursor-pointer rounded-[10px] border border-line px-2.5 text-xs transition-colors",
              showFavorites ? "bg-[var(--panel2)] text-[var(--txt)]" : "text-[var(--txt-faint)] hover:text-[var(--txt)]",
            )}
          >
            ♥ FAVORITES
          </button>
        </div>
      </div>

      {/* recently played */}
      {recent.length > 0 ? (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Disc3 size={14} className="text-[var(--txt-faint)]" />
            <span className="meta">RECENTLY PLAYED</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recent.map((t) => (
              <button
                key={t.id}
                onClick={() => player.playTrack(t, recent)}
                className="group w-32 shrink-0 cursor-pointer text-left"
              >
                {t.cover_url ? (
                  <img src={t.cover_url} alt="" loading="lazy" className="mb-2 size-32 rounded-xl border border-line object-cover transition-all group-hover:border-[color-mix(in_srgb,var(--txt)_30%,var(--line))] group-hover:shadow-[0_0_30px_var(--glow)]" />
                ) : (
                  <div className="dot-grid-sm mb-2 flex size-32 items-center justify-center rounded-xl border border-line text-[var(--txt-faint)]">
                    <Music2 size={20} />
                  </div>
                )}
                <p className="truncate text-xs text-[var(--txt)]">{t.title}</p>
                <p className="meta truncate normal-case">{t.artist}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* library */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14">
          <WaveformLoader size={64} className="text-[var(--txt)]" label="LOADING LIBRARY" />
        </div>
      ) : tracks.length === 0 ? (
        <EmptyState
          icon={<Music2 size={16} />}
          title="LIBRARY IS EMPTY"
          description="Add a Spotify, SoundCloud or direct audio link to start the collection."
          action={<Button variant="outline" size="sm" onClick={() => setModalOpen(true)}><Plus size={13} /> Add music</Button>}
        />
      ) : (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-line">
          <div className="grid grid-cols-1 items-center gap-3 border-b border-line px-3 py-2 md:grid-cols-[1fr_auto_auto_auto_auto_auto]">
            <span className="meta hidden md:block">TRACK</span>
            <span className="meta hidden w-28 md:block">SOURCE</span>
            <span className="meta hidden w-24 text-right md:block">ADDED</span>
          </div>
          <AnimatePresence initial={false}>
            {tracks.map((t) => (
              <TrackRow
                key={t.id}
                track={t}
                queue={tracks}
                onEdit={(x) => { setEditing(x); setModalOpen(true); }}
                onRemove={remove}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AddMusicModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}