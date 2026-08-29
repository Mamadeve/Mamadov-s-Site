/**
 * Music providers — unified resolution
 * Detects the source from a URL and fetches official metadata (oEmbed).
 * All providers are free-tier / no-auth and fail gracefully.
 */
import type { MusicSource } from "@/types/database";
import { isValidUrl } from "@/lib/utils";
import {
  isSpotifyUrl,
  fetchSpotifyMetadata,
  spotifyEmbedUrl,
  spotifyEmbedHeight,
  type ResolvedMetadata as SpotifyMeta,
} from "./spotify";
import {
  isSoundcloudUrl,
  fetchSoundcloudMetadata,
  scEmbedUrl,
  type ResolvedMetadata as SoundcloudMeta,
} from "./soundcloud";

export type { SpotifyMeta, SoundcloudMeta };
export { spotifyEmbedUrl, spotifyEmbedHeight, scEmbedUrl };

export function detectSource(url: string): MusicSource | null {
  if (isSpotifyUrl(url)) return "spotify";
  if (isSoundcloudUrl(url)) return "soundcloud";
  if (isValidUrl(url)) return "direct";
  return null;
}

export async function resolveMetadata(
  url: string,
): Promise<Partial<SpotifyMeta & SoundcloudMeta> & { provider: MusicSource }> {
  if (isSpotifyUrl(url)) {
    return { ...(await fetchSpotifyMetadata(url)), provider: "spotify" };
  }
  if (isSoundcloudUrl(url)) {
    return { ...(await fetchSoundcloudMetadata(url)), provider: "soundcloud" };
  }
  return { provider: "direct" };
}

/** Try to read duration for direct audio files without playing. Never rejects. */
export function probeDirectDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const a = new Audio();
      const done = (d: number | null) => {
        a.src = "";
        resolve(d);
      };
      const timer = setTimeout(() => done(null), 8000);
      a.preload = "metadata";
      a.addEventListener("loadedmetadata", () => {
        clearTimeout(timer);
        done(Number.isFinite(a.duration) ? Math.round(a.duration) : null);
      });
      a.addEventListener("error", () => {
        clearTimeout(timer);
        done(null);
      });
      a.src = url;
    } catch {
      resolve(null);
    }
  });
}
