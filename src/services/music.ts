/**
 * Service — music library
 */
import type { MusicTrack, TrackPlay, TrackWithMeta } from "@/types/database";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";

const TRACK_SELECT = `
  *,
  added_by_profile:profiles!music_tracks_added_by_fkey(id, display_name, username),
  category:categories(id, name, color)
`;

export interface MusicFilters {
  search?: string;
  categoryId?: string;
  source?: string;
  userId?: string;
  favoritesOnly?: boolean;
}

export async function listTracks(filters: MusicFilters = {}): Promise<TrackWithMeta[]> {
  let q = supabase
    .from("music_tracks")
    .select(TRACK_SELECT)
    .order("created_at", { ascending: false });

  if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters.source) q = q.eq("source", filters.source);
  if (filters.search) {
    const s = filters.search.replace(/[%,()]/g, " ").trim();
    if (s) q = q.or(`title.ilike.%${s}%,artist.ilike.%${s}%,album.ilike.%${s}%`);
  }

  const { data, error } = await q;
  if (error) throw error;

  let tracks = (data ?? []) as unknown as TrackWithMeta[];
  if (filters.userId) {
    const favIds = await listFavoriteTrackIds(filters.userId);
    const favSet = new Set(favIds);
    tracks = tracks.map((t) => ({ ...t, is_favorite: favSet.has(t.id) }));
    if (filters.favoritesOnly) tracks = tracks.filter((t) => favSet.has(t.id));
  }
  return tracks;
}

export interface NewTrackInput {
  title: string;
  artist: string;
  album?: string | null;
  cover_url?: string | null;
  source: "spotify" | "soundcloud" | "direct";
  source_url: string;
  duration_seconds?: number | null;
  notes?: string | null;
  category_id?: string | null;
}

export async function addTrack(input: NewTrackInput, userId: string): Promise<MusicTrack> {
  const { data, error } = await supabase
    .from("music_tracks")
    .insert({
      title: input.title.trim(),
      artist: input.artist.trim(),
      album: input.album || null,
      cover_url: input.cover_url || null,
      source: input.source,
      source_url: input.source_url.trim(),
      duration_seconds: input.duration_seconds ?? null,
      notes: input.notes || null,
      category_id: input.category_id || null,
      added_by: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MusicTrack;
}

export async function updateTrack(id: string, patch: Partial<MusicTrack>): Promise<MusicTrack> {
  const { data, error } = await supabase
    .from("music_tracks")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as MusicTrack;
}

export async function deleteTrack(id: string): Promise<void> {
  const { error } = await supabase.from("music_tracks").delete().eq("id", id);
  if (error) throw error;
}

/* ── Favorites & plays ───────────────────────────────────── */

export async function listFavoriteTrackIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("music_favorites")
    .select("item_id")
    .eq("user_id", userId);
  if (error) return [];
  return (data ?? []).map((r) => r.item_id as string);
}

export async function toggleTrackFavorite(userId: string, trackId: string, favorite: boolean) {
  if (favorite) {
    return supabase.from("music_favorites").insert({ user_id: userId, item_id: trackId });
  }
  return supabase
    .from("music_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("item_id", trackId);
}

export async function recordTrackPlay(trackId: string): Promise<void> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("track_plays").insert({ user_id: data.user.id, track_id: trackId });
}

export async function listRecentlyPlayed(userId: string, limit = 8): Promise<TrackWithMeta[]> {
  const { data, error } = await supabase
    .from("track_plays")
    .select(`played_at, track:music_tracks!track_plays_track_id_fkey(${TRACK_SELECT})`)
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(limit * 2);
  if (error) return [];
  const seen = new Set<string>();
  const out: TrackWithMeta[] = [];
  for (const row of data as unknown as { track: TrackWithMeta | null }[]) {
    const t = row.track;
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
    if (out.length >= limit) break;
  }
  return out;
}

export async function listPlaysRaw(userId: string): Promise<TrackPlay[]> {
  const { data } = await supabase
    .from("track_plays")
    .select("*")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(100);
  return (data ?? []) as TrackPlay[];
}

/* ── Direct audio upload (Supabase Storage) ──────────────── */

export const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac"] as const;

export function isAudioFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return (AUDIO_EXTENSIONS as readonly string[]).includes(ext) || file.type.startsWith("audio/");
}

export interface UploadResult {
  path: string;
  publicUrl: string;
}

/**
 * Upload an audio file to the private-ish `music` storage bucket under the
 * uploader's folder. Uses XHR for real byte-level progress. Credentials
 * stay server-side (bearer token from the session); nothing sensitive is
 * exposed to the UI.
 */
export function uploadAudioFile(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    void (async () => {
      try {
        if (!isAudioFile(file)) {
          reject(new Error("Unsupported file — use MP3, WAV, OGG or M4A."));
          return;
        }
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          reject(new Error("Not signed in."));
          return;
        }
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${userId}/${Date.now()}_${safeName}`;
        const base = supabaseUrl;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${base}/storage/v1/object/music/${path}`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("apikey", supabaseAnonKey);
        xhr.setRequestHeader("x-upsert", "true");
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              path,
              publicUrl: `${base}/storage/v1/object/public/music/${path}`,
            });
          } else {
            let msg = `Upload failed (HTTP ${xhr.status}).`;
            try {
              const body = JSON.parse(xhr.responseText) as { message?: string };
              if (body.message) msg = body.message;
            } catch {
              /* keep default */
            }
            reject(new Error(msg));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload."));
        xhr.send(file);
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Upload failed."));
      }
    })();
  });
}

/** Delete an uploaded object (best-effort, when a track is removed). */
export async function deleteAudioObject(path: string): Promise<void> {
  await supabase.storage.from("music").remove([path]).then(() => undefined, () => undefined);
}

/* ── Cover image upload (stored in the same public `music` bucket) ── */

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif", "gif"] as const;

export function isImageFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return (IMAGE_EXTENSIONS as readonly string[]).includes(ext) || file.type.startsWith("image/");
}

/**
 * Upload a cover image for a track. Uses the same XHR progress pattern as
 * `uploadAudioFile`; credentials stay server-side. Nothing sensitive is
 * exposed to the UI.
 */
export function uploadCoverImage(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    void (async () => {
      try {
        if (!isImageFile(file)) {
          reject(new Error("Unsupported image — use JPG, PNG, WEBP or AVIF."));
          return;
        }
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          reject(new Error("Not signed in."));
          return;
        }
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${userId}/cover_${Date.now()}_${safeName}`;
        const base = supabaseUrl;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${base}/storage/v1/object/music/${path}`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("apikey", supabaseAnonKey);
        xhr.setRequestHeader("x-upsert", "true");
        xhr.setRequestHeader("Content-Type", file.type || "image/jpeg");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              path,
              publicUrl: `${base}/storage/v1/object/public/music/${path}`,
            });
          } else {
            let msg = `Upload failed (HTTP ${xhr.status}).`;
            try {
              const body = JSON.parse(xhr.responseText) as { message?: string };
              if (body.message) msg = body.message;
            } catch {
              /* keep default */
            }
            reject(new Error(msg));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload."));
        xhr.send(file);
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Upload failed."));
      }
    })();
  });
}

/* ── Upload limits & review workflow ────────────────────────── */

/**
 * Count direct audio uploads the user has already added (the DB enforces a
 * hard limit of 1 uploaded file per non-admin account; links are unlimited).
 * Never rejects.
 */
export async function countUserDirectUploads(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("music_tracks")
      .select("id", { count: "exact", head: true })
      .eq("added_by", userId)
      .eq("source", "direct");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Admin-only: approve / reject a pending user-submitted track. */
export async function setTrackStatus(id: string, status: "pending" | "approved" | "rejected"): Promise<void> {
  const { error } = await supabase.from("music_tracks").update({ status }).eq("id", id);
  if (error) throw error;
}

