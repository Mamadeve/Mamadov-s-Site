/**
 * Music provider — SoundCloud (official & free)
 *
 * Uses the official SoundCloud **oEmbed** endpoint (no API key, JSON+CORS):
 *   https://soundcloud.com/oembed?format=json&url=<track-url>
 * Returns: title ("Track by Artist"), thumbnail_url, html (visual widget iframe).
 * Playback uses the official widget — fully ToS-compliant.
 */
import { isSoundcloudUrl as _isScUrl, isValidUrl } from "@/lib/utils";

/** Re-export for the provider index */
export const isSoundcloudUrl = _isScUrl;

export interface ResolvedMetadata {
  title?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  durationSeconds?: number | null;
  embedUrl?: string;
  provider: "spotify" | "soundcloud" | "direct";
}

export function scEmbedUrl(url: string, autoPlay = true): string {
  const params = new URLSearchParams({
    url,
    auto_play: String(autoPlay),
    show_comments: "false",
    visual: "false",
    color: "f5f5f7",
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

/** Fetch official metadata via oEmbed. Never throws. */
export async function fetchSoundcloudMetadata(url: string): Promise<Partial<ResolvedMetadata>> {
  if (!isValidUrl(url) || !isSoundcloudUrl(url)) return {};
  try {
    const res = await fetch(
      `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    );
    if (!res.ok) return {};
    const data = (await res.json()) as {
      title?: string; // "Flickermood by Forss"
      author_name?: string;
      thumbnail_url?: string;
      html?: string;
    };
    let title = data.title;
    let artist = data.author_name;
    if (title?.includes(" by ")) {
      const idx = title.lastIndexOf(" by ");
      if (!artist || !title.startsWith(artist)) {
        artist = title.slice(idx + 4);
        title = title.slice(0, idx);
      } else {
        title = title.slice(0, idx);
      }
    }
    // Extract widget src from the returned embed html
    const m = data.html?.match(/src="([^"]+)"/);
    return {
      title,
      artist,
      coverUrl: data.thumbnail_url,
      embedUrl: m?.[1] ?? scEmbedUrl(url),
    };
  } catch {
    return {};
  }
}
