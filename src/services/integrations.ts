/**
 * Service — external provider integrations (Spotify, SoundCloud, …).
 *
 * Config is persisted admin-only in `app_settings` under the key
 * `integrations`. A sanitized mirror (no secrets) is written to
 * `public.integrations` (readable via the app_public_settings view) so the
 * player can adapt to enabled providers without exposing credentials.
 *
 * SECURITY: client secrets are write-only in the UI (masked). For
 * production, move token exchange behind an edge function.
 */
import { supabase } from "@/lib/supabase";

export type ProviderId = "spotify" | "soundcloud";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  enabled: boolean;
  clientId: string;
  /** write-only in the UI; stored server-side */
  clientSecret: string;
  redirectUri: string;
  playbackEnabled: boolean;
  searchEnabled: boolean;
  metadataEnabled: boolean;
  priority: number;
  docsUrl: string;
  lastTestAt?: string | null;
  lastTestStatus?: "connected" | "error" | null;
  lastTestError?: string | null;
}

export type IntegrationsMap = Record<ProviderId, ProviderConfig>;
export type ConnectionStatus = "CONNECTED" | "NOT CONFIGURED" | "ERROR" | "DISABLED";

const KEY = "integrations";
const PUBLIC_KEY = "public.integrations";

const DOCS = {
  spotify: "https://developer.spotify.com/documentation/web-api",
  soundcloud: "https://developers.soundcloud.com/docs/api",
} as const;

export function defaultIntegrations(): IntegrationsMap {
  return {
    spotify: {
      id: "spotify", label: "Spotify", enabled: false,
      clientId: "", clientSecret: "",
      redirectUri: `${window.location.origin}/settings`,
      playbackEnabled: true, searchEnabled: true, metadataEnabled: true,
      priority: 1, docsUrl: DOCS.spotify,
      lastTestAt: null, lastTestStatus: null, lastTestError: null,
    },
    soundcloud: {
      id: "soundcloud", label: "SoundCloud", enabled: false,
      clientId: "", clientSecret: "",
      redirectUri: `${window.location.origin}/settings`,
      playbackEnabled: true, searchEnabled: true, metadataEnabled: true,
      priority: 2, docsUrl: DOCS.soundcloud,
      lastTestAt: null, lastTestStatus: null, lastTestError: null,
    },
  };
}

/** Load saved integrations (admin only). Falls back to defaults. */
export async function loadIntegrations(): Promise<IntegrationsMap> {
  const defaults = defaultIntegrations();
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    if (error || !data) return defaults;
    const saved = data.value as Partial<IntegrationsMap>;
    const merged = { ...defaults };
    for (const id of Object.keys(merged) as ProviderId[]) {
      merged[id] = { ...merged[id], ...(saved?.[id] ?? {}) };
    }
    return merged;
  } catch {
    return defaults;
  }
}

/** Save integrations + refresh the sanitized public mirror. */
export async function saveIntegrations(map: IntegrationsMap): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
  const { error } = await supabase.from("app_settings").upsert({ key: KEY, value: map, updated_by: uid });
  if (error) throw error;
  // sanitized mirror — no secrets, no keys
  const pub: Record<string, unknown> = {};
  for (const p of Object.values(map)) {
    pub[p.id] = {
      enabled: p.enabled,
      playbackEnabled: p.playbackEnabled,
      searchEnabled: p.searchEnabled,
      metadataEnabled: p.metadataEnabled,
      priority: p.priority,
    };
  }
  await supabase.from("app_settings").upsert({ key: PUBLIC_KEY, value: pub, updated_by: uid });
}

/** Read the sanitized public view (any authenticated user). Never rejects. */
export async function loadPublicIntegrations(): Promise<Record<string, { enabled: boolean; playbackEnabled: boolean }> | null> {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", PUBLIC_KEY)
      .maybeSingle();
    return (data?.value as never) ?? null;
  } catch {
    return null;
  }
}

/** Derive the visible connection status for a provider card. */
export function connectionStatus(p: ProviderConfig): ConnectionStatus {
  if (!p.enabled) return "DISABLED";
  if (p.lastTestStatus === "error") return "ERROR";
  if (p.lastTestStatus === "connected" && p.clientId) return "CONNECTED";
  if (p.clientId) return "CONNECTED";
  return "NOT CONFIGURED";
}

/**
 * Test a provider connection using only officially supported endpoints.
 * Spotify: client-credentials token request (validates id + secret).
 * SoundCloud: oEmbed reachability probe.
 */
export async function testConnection(p: ProviderConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    if (p.id === "spotify") {
      if (!p.clientId || !p.clientSecret) return { ok: false, error: "Client ID and Client Secret are required." };
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${p.clientId}:${p.clientSecret}`)}`,
        },
        body: "grant_type=client_credentials",
      });
      if (res.ok) return { ok: true };
      const body = (await res.json().catch(() => ({}))) as { error_description?: string; error?: string };
      return { ok: false, error: body.error_description ?? body.error ?? `HTTP ${res.status}` };
    }
    // soundcloud — probe the official oEmbed endpoint
    const res = await fetch(
      `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent("https://soundcloud.com/forss/flickermood")}`,
    );
    if (res.ok) return { ok: true };
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

