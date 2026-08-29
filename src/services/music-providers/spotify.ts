/**
 * Music provider — Spotify (official & free)
 *
 * Uses the official Spotify **oEmbed** endpoint (no auth, no key):
 *   https://open.spotify.com/oembed?url=<track-url>
 * Returns: title, thumbnail_url, iframe_url (official embed).
 * Playback uses the official Spotify embed iframe — fully ToS-compliant.
 * The app degrades gracefully: if the network/oEmbed fails, the user-entered
 * title/artist are kept and the embed simply isn't rendered.
 */
import { parseSpotifyUrl, isValidUrl } from "@/lib/utils";

export interface ResolvedMetadata {
  title?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  durationSeconds?: number | null;
  embedUrl?: string;
  provider: "spotify" | "soundcloud" | "direct";
}

export function isSpotifyUrl(input: string): boolean {
  return parseSpotifyUrl(input) !== null;
}

export function spotifyEmbedUrl(input: string): string | null {
  const parsed = parseSpotifyUrl(input);
  if (!parsed) return null;
  const height = parsed.type === "track" ? 152 : 352;
  return `https://open.spotify.com/embed/${parsed.type}/${parsed.id}?utm_source=mamado&theme=0&height=${height}`;
}

export function spotifyEmbedHeight(input: string): number {
  const parsed = parseSpotifyUrl(input);
  return parsed && parsed.type === "track" ? 152 : 352;
}

/** Fetch official metadata via oEmbed. Never throws. */
export async function fetchSpotifyMetadata(url: string): Promise<Partial<ResolvedMetadata>> {
  if (!isValidUrl(url) || !isSpotifyUrl(url)) return {};
  try {
    const res = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
    );
    if (!res.ok) return {};
    const data = (await res.json()) as {
      title?: string;
      thumbnail_url?: string;
      iframe_url?: string;
    };
    return {
      title: data.title,
      coverUrl: data.thumbnail_url,
      embedUrl: data.iframe_url ?? spotifyEmbedUrl(url) ?? undefined,
    };
  } catch {
    return {};
  }
}
