/**
 * Store — persistent music player
 *
 * Two playback engines:
 *  1. "direct"  → HTML5 <audio> with full custom controls (progress, volume, seek)
 *  2. "embed"   → official Spotify / SoundCloud embed iframes.
 *                 Browsers + ToS require their own UI, so "play" mounts the
 *                 official embed with autoplay; next/prev switch tracks; pause
 *                 unmounts the embed (which stops audio).
 */
import { create } from "zustand";
import type { TrackWithMeta } from "@/types/database";
import { recordTrackPlay } from "@/services/music";
import { useUIStore } from "@/store/ui";

export type RepeatMode = "off" | "all" | "one";

/**
 * Honest playback state machine surfaced in the UI:
 * idle → loading → ready → playing ⇄ paused → (error | unsupported)
 */
export type PlaybackState = "idle" | "loading" | "ready" | "playing" | "paused" | "error" | "unsupported";

interface PlayerState {
  queue: TrackWithMeta[];
  history: string[]; // recently played track ids (most recent first)
  currentId: string | null;
  isPlaying: boolean;
  playbackState: PlaybackState;
  playbackError: string | null;
  progress: number; // seconds (direct engine)
  duration: number; // seconds (direct engine)
  volume: number; // 0..1
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  favorites: Set<string>;

  playTrack: (track: TrackWithMeta, contextQueue?: TrackWithMeta[]) => void;
  togglePlay: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setProgress: (p: number) => void;
  setDuration: (d: number) => void;
  toggleFavorite: (trackId: string) => void;
  setFavorites: (ids: string[]) => void;
  removeFromQueue: (trackId: string) => void;
}

/** Module-level audio element for the "direct" engine */
export const audioEl: HTMLAudioElement =
  typeof Audio !== "undefined" ? new Audio() : ({} as HTMLAudioElement);

let lastRecordedId: string | null = null;

function orderedQueue(queue: TrackWithMeta[], fromIndex: number, shuffle: boolean): TrackWithMeta[] {
  if (!shuffle) return queue;
  const rest = queue.filter((_, i) => i !== fromIndex);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [queue[fromIndex], ...rest];
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  /* ── wire the direct audio element once ─────────────────── */
  if (typeof Audio !== "undefined" && audioEl.addEventListener) {
    audioEl.addEventListener("timeupdate", () => {
      set({ progress: audioEl.currentTime });
    });
    audioEl.addEventListener("durationchange", () => {
      if (Number.isFinite(audioEl.duration)) set({ duration: audioEl.duration });
    });
    audioEl.addEventListener("loadstart", () => {
      set({ playbackState: "loading", playbackError: null });
    });
    audioEl.addEventListener("canplay", () => {
      set((s) => (s.playbackState === "loading" ? { playbackState: "ready", playbackError: null } : {}));
    });
    audioEl.addEventListener("playing", () => {
      set({ playbackState: "playing", isPlaying: true, playbackError: null });
    });
    audioEl.addEventListener("pause", () => {
      set((s) => (s.playbackState === "playing" ? { playbackState: "paused", isPlaying: false } : {}));
    });
    audioEl.addEventListener("waiting", () => {
      set({ playbackState: "loading" });
    });
    audioEl.addEventListener("ended", () => {
      const { repeat, next } = get();
      if (repeat === "one") {
        audioEl.currentTime = 0;
        void audioEl.play().catch(() => set({ isPlaying: false }));
      } else {
        next();
      }
    });
    audioEl.addEventListener("error", () => {
      // Root-cause honest error instead of silently failing.
      const mediaErr = audioEl.error;
      const msg =
        mediaErr?.code === 4
          ? "This audio format or URL can't be played in the browser."
          : mediaErr?.code === 2
            ? "Network error while fetching the audio."
            : mediaErr?.code === 3
              ? "The audio failed to decode."
              : "Playback error.";
      set({ playbackState: "error", playbackError: msg, isPlaying: false });
    });
  }

  const startDirect = (track: TrackWithMeta) => {
    set({ playbackState: "loading", playbackError: null, progress: 0, duration: track.duration_seconds ?? 0 });
    if (audioEl.src !== track.source_url) audioEl.src = track.source_url;
    else audioEl.currentTime = 0;
    audioEl.volume = get().muted ? 0 : get().volume;
    audioEl.play().catch((e: unknown) => {
      const name = e instanceof Error ? e.name : "";
      if (name === "NotAllowedError") {
        set({
          playbackState: "paused",
          playbackError: "Browser blocked autoplay — press play once more.",
          isPlaying: false,
        });
      } else if (name === "NotSupportedError") {
        set({ playbackState: "unsupported", playbackError: "Unsupported audio source.", isPlaying: false });
      } else {
        set({ playbackState: "error", playbackError: "Couldn't start playback.", isPlaying: false });
      }
    });
  };

  /** Official embeds (Spotify / SoundCloud): browsers + ToS require their own
   *  UI, so "play" opens the official embed dock with autoplay. Honest and
   *  compliant — no fake progress bars. */
  const startEmbed = (track: TrackWithMeta) => {
    audioEl.pause();
    set({
      playbackState: "ready",
      playbackError: null,
      progress: 0,
      duration: track.duration_seconds ?? 0,
    });
    useUIStore.getState().setPlayerExpanded(true);
  };

  const startTrack = (track: TrackWithMeta, contextQueue?: TrackWithMeta[]) => {
    const { shuffle, history, favorites, queue: prevQueue } = get();
    const ctx =
      contextQueue && contextQueue.length > 0
        ? contextQueue
        : prevQueue.length > 0
          ? prevQueue
          : [track];
    const queue = orderedQueue(ctx, Math.max(0, ctx.findIndex((t) => t.id === track.id)), shuffle);

    set({
      currentId: track.id,
      queue,
      isPlaying: true,
      progress: 0,
      duration: track.duration_seconds ?? 0,
      favorites: track.is_favorite ? new Set(favorites).add(track.id) : favorites,
    });

    if (track.source === "direct") startDirect(track);
    else startEmbed(track);

    // Record play for "recently played" — once per selection
    if (lastRecordedId !== track.id) {
      lastRecordedId = track.id;
      void recordTrackPlay(track.id);
    }
    set({
      history: [track.id, ...history.filter((id) => id !== track.id)].slice(0, 24),
    });
  };

  const stepTrack = (dir: 1 | -1) => {
    const { queue, currentId, repeat } = get();
    if (queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === currentId);
    let nextIdx = idx + dir;
    if (nextIdx >= queue.length) {
      if (repeat === "off" && dir === 1) {
        if (audioEl.pause) audioEl.pause();
        set({ isPlaying: false });
        return;
      }
      nextIdx = 0;
    }
    if (nextIdx < 0) nextIdx = queue.length - 1;
    startTrack(queue[nextIdx]);
  };
  return {
    queue: [],
    history: [],
    currentId: null,
    isPlaying: false,
    playbackState: "idle",
    playbackError: null,
    progress: 0,
    duration: 0,
    volume: 0.8,
    muted: false,
    shuffle: false,
    repeat: "off",
    favorites: new Set<string>(),

    playTrack: (track, contextQueue) => {
      if (track.id === get().currentId) {
        get().togglePlay();
        return;
      }
      startTrack(track, contextQueue);
    },

    togglePlay: () => {
      const { isPlaying, currentId, queue, playbackError } = get();
      if (!currentId) {
        if (queue.length > 0) startTrack(queue[0]);
        return;
      }
      const track = queue.find((t) => t.id === currentId);
      if (isPlaying) {
        if (track?.source === "direct") audioEl.pause();
        set({ isPlaying: false, playbackState: "paused" });
      } else if (track?.source === "direct") {
        if (playbackError) {
          // retry from scratch after an error
          set({ playbackError: null, playbackState: "loading" });
          audioEl.src = track.source_url;
        }
        audioEl.play().catch(() => set({ isPlaying: false }));
      } else {
        // embed → (re)mount the official player dock
        if (track) startEmbed(track);
        set({ isPlaying: true });
      }
    },

    pause: () => {
      const { currentId, queue } = get();
      const track = queue.find((t) => t.id === currentId);
      if (track?.source === "direct") audioEl.pause();
      set({ isPlaying: false, playbackState: "paused" });
    },

    next: () => stepTrack(1),

    prev: () => {
      const { currentId, queue, progress } = get();
      const track = queue.find((t) => t.id === currentId);
      if (track?.source === "direct" && progress > 3) {
        audioEl.currentTime = 0;
        return;
      }
      stepTrack(-1);
    },

    seek: (seconds) => {
      const { currentId, queue } = get();
      const track = queue.find((t) => t.id === currentId);
      if (track?.source === "direct" && audioEl.src) {
        audioEl.currentTime = seconds;
      }
      set({ progress: seconds });
    },

    setVolume: (v) => {
      const vol = Math.min(1, Math.max(0, v));
      audioEl.volume = get().muted ? 0 : vol;
      set({ volume: vol });
    },

    toggleMute: () => {
      const muted = !get().muted;
      audioEl.volume = muted ? 0 : get().volume;
      set({ muted });
    },

    toggleShuffle: () => {
      const { shuffle, queue, currentId } = get();
      const nextShuffle = !shuffle;
      if (nextShuffle && currentId) {
        const idx = Math.max(0, queue.findIndex((t) => t.id === currentId));
        set({ shuffle: nextShuffle, queue: orderedQueue(queue, idx, true) });
      } else {
        set({ shuffle: nextShuffle });
      }
    },

    cycleRepeat: () =>
      set((s) => ({
        repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
      })),

    setProgress: (p) => set({ progress: p }),
    setDuration: (d) => set({ duration: d }),

    toggleFavorite: (trackId) =>
      set((s) => {
        const favorites = new Set(s.favorites);
        if (favorites.has(trackId)) favorites.delete(trackId);
        else favorites.add(trackId);
        return { favorites };
      }),

    setFavorites: (ids) => set({ favorites: new Set(ids) }),

    removeFromQueue: (trackId) =>
      set((s) => {
        if (s.currentId === trackId) {
          if (audioEl.pause) audioEl.pause();
          return {
            queue: s.queue.filter((t) => t.id !== trackId),
            currentId: null,
            isPlaying: false,
            playbackState: "idle",
            playbackError: null,
          };
        }
        return { queue: s.queue.filter((t) => t.id !== trackId) };
      }),
  };
});
