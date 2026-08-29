/**
 * Music provider — Apple Music / iTunes (official & free).
 *
 * Metadata: official iTunes Search / Lookup API — no key, no auth.
 * Playback: official Apple Music embed iframe (ToS-compliant).
 * Graceful degradation: if lookup fails, user-entered fields are kept.
 */
import { isValidUrl } from "@/lib/utils";

export interface ResolvedMetadata {
  title?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  durationSeconds?: number | null;
  embedUrl?: string;
  provider: "applemusic";
}

/** Parse an Apple Music URL → { store, albumId, trackId? } */
export function parseAppleMusicUrl(
  input: string,
): { store: string; albumId: string; trackId?: string } | null {
  try {
    const u = new URL(input);
    if (!/(^|\.)music\.apple\.com$/.test(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean); // [store, album|song|playlist, slug, id]
    const kindIdx = parts.findIndex((p) => p === "album" || p === "song" || p === "playlist");
    if (kindIdx === -1) return null;
    const id = parts[kindIdx + 2];
    if (!id || !/^\d+$/.test(id)) return null;
    const trackId = u.searchParams.get("i") ?? undefined;
    return { store: parts[0] || "us", albumId: id, trackId };
  } catch {
    return null;
  }
}

export function isAppleMusicUrl(input: string): boolean {
  return parseAppleMusicUrl(input) !== null;
}

export function appleMusicEmbedUrl(input: string): string | null {
  const p = parseAppleMusicUrl(input);
  if (!p) return null;
  return `https://embed.music.apple.com/${p.store}/album/${p.albumId}${p.trackId ? `?i=${p.trackId}` : ""}`;
}

export function appleMusicEmbedHeight(input: string): number {
  return parseAppleMusicUrl(input)?.trackId ? 150 : 450;
}

/** Official iTunes Lookup API — never throws. */
export async function fetchAppleMusicMetadata(url: string): Promise<Partial<ResolvedMetadata>> {
  if (!isValidUrl(url) || !isAppleMusicUrl(url)) return {};
  const p = parseAppleMusicUrl(url);
  if (!p) return {};
  try {
    const lookupId = p.trackId ?? p.albumId;
    const res = await fetch(`https://itunes.apple.com/lookup?id=${lookupId}&country=${p.store}`);
    if (!res.ok) return {};
    const data = (await res.json()) as { results?: Array<Record<string, unknown>> };
    const r = data.results?.find((x) => x.wrapperType === "track") ?? data.results?.[0];
    if (!r) return {};
    const artwork = typeof r.artworkUrl100 === "string" ? r.artworkUrl100.replace("100x100", "600x600") : undefined;
    return {
      title: (r.trackName ?? r.collectionName) as string | undefined,
      artist: r.artistName as string | undefined,
      album: r.collectionName as string | undefined,
      coverUrl: artwork,
      durationSeconds: r.trackTimeMillis ? Math.round((r.trackTimeMillis as number) / 1000) : null,
    };
  } catch {
    return {};
  }
}
