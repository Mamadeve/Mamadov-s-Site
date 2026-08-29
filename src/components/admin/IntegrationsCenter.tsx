/**
 * IntegrationsCenter — admin-only API & integrations settings.
 * Provider cards (Spotify / SoundCloud / future) with status, credentials
 * (masked), enable/disable, per-capability switches, test connection and
 * documentation links. Persisted via the integrations service.
 */
import { useEffect, useState } from "react";
import { BookOpen, Plug, RefreshCw } from "lucide-react";
import {
  loadIntegrations,
  saveIntegrations,
  testConnection,
  connectionStatus,
  defaultIntegrations,
  type IntegrationsMap,
  type ProviderConfig,
} from "@/services/integrations";
import { Button, Input, FieldLabel } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/bits";
import { ApertureLoader } from "@/components/ui/CircleLoaders";
import { useToast } from "@/store";
import { dbErrorMessage } from "@/lib/supabase";
import { cn, timeAgo } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  CONNECTED: "var(--color-positive)",
  "NOT CONFIGURED": "var(--txt-faint)",
  ERROR: "var(--color-negative)",
  DISABLED: "var(--txt-faint)",
};

const PROVIDER_LABEL: Record<string, string> = {
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  applemusic: "Apple Music",
  jamendo: "Jamendo",
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors",
        checked ? "border-[var(--txt)] bg-[var(--txt)]" : "border-line bg-[var(--panel2)]",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full transition-all",
          checked ? "left-[18px] bg-[var(--bg)]" : "left-0.5 bg-[var(--txt-faint)]",
        )}
      />
    </button>
  );
}

function ProviderCard({
  provider,
  onChange,
  onTested,
}: {
  provider: ProviderConfig;
  onChange: (p: ProviderConfig) => void;
  onTested: (id: ProviderConfig["id"], ok: boolean, error?: string) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [secret, setSecret] = useState("");
  const status = connectionStatus(provider);
  const set = (patch: Partial<ProviderConfig>) => onChange({ ...provider, ...patch });

  const runTest = async () => {
    setTesting(true);
    const res = await testConnection({ ...provider, clientSecret: secret || provider.clientSecret });
    onTested(provider.id, res.ok, res.error);
    setTesting(false);
  };

  return (
    <section className="card-surface glow-hover p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Plug size={14} className="text-[var(--txt-dim)]" />
          <h3 className="text-[13px] font-semibold text-[var(--txt)]">{provider.label}</h3>
          <Badge dot={STATUS_COLOR[status]}>{status}</Badge>
        </div>
        <Toggle checked={provider.enabled} onChange={(v) => set({ enabled: v })} label={`Enable ${provider.label}`} />
      </div>

      <div className="grid gap-3">
        <div>
          <FieldLabel>Client ID</FieldLabel>
          <Input value={provider.clientId} onChange={(e) => set({ clientId: e.target.value.trim() })} placeholder="Client ID from the provider dashboard" autoCapitalize="none" />
        </div>
        <div>
          <FieldLabel>Client Secret — write-only</FieldLabel>
          <Input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={provider.clientSecret ? "•••••••••••• (saved — type to replace)" : "Paste secret to store"}
            autoComplete="new-password"
          />
        </div>
        <div>
          <FieldLabel>Redirect URI</FieldLabel>
          <Input value={provider.redirectUri} onChange={(e) => set({ redirectUri: e.target.value.trim() })} />
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
          {([
            ["playbackEnabled", "Playback"],
            ["searchEnabled", "Search"],
            ["metadataEnabled", "Metadata"],
          ] as const).map(([field, label]) => (
            <label key={field} className="flex cursor-pointer items-center gap-2 text-xs text-[var(--txt-dim)]">
              <Toggle checked={provider[field]} onChange={(v) => set({ [field]: v } as Partial<ProviderConfig>)} label={label} />
              {label}
            </label>
          ))}
          <label className="flex items-center gap-2 text-xs text-[var(--txt-dim)]">
            Priority
            <Input
              type="number"
              min={1}
              value={provider.priority}
              onChange={(e) => set({ priority: Number(e.target.value) || 1 })}
              className="h-7 w-14 px-2 text-xs"
            />
          </label>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" loading={testing} onClick={() => void runTest()}>
            <RefreshCw size={12} /> Test connection
          </Button>
          <a href={provider.docsUrl} target="_blank" rel="noreferrer" className="meta flex items-center gap-1.5 hover:text-[var(--txt-dim)]">
            <BookOpen size={12} /> Docs
          </a>
          {provider.lastTestAt ? (
            <span className="meta">
              LAST TEST {timeAgo(provider.lastTestAt)}
              {provider.lastTestError ? ` · ${provider.lastTestError}` : ""}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function IntegrationsCenter() {
  const toast = useToast();
  const [map, setMap] = useState<IntegrationsMap | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadIntegrations().then(setMap);
  }, []);

  if (!map) {
    return (
      <div className="flex justify-center py-10">
        <ApertureLoader size={56} label="LOADING INTEGRATIONS" />
      </div>
    );
  }

  const update = (p: ProviderConfig) => {
    setMap((prev) => (prev ? { ...prev, [p.id]: p } : prev));
    void (async () => {
      setSaving(true);
      try {
        const next = { ...(map ?? defaultIntegrations()), [p.id]: p };
        await saveIntegrations(next);
      } catch (e) {
        toast({ title: "Couldn't save configuration", description: dbErrorMessage(e as never), variant: "error" });
      } finally {
        setSaving(false);
      }
    })();
  };

  const onTested = (id: ProviderConfig["id"], ok: boolean, error?: string) => {
    setMap((prev) => {
      if (!prev) return prev;
      const next: IntegrationsMap = {
        ...prev,
        [id]: {
          ...prev[id],
          lastTestAt: new Date().toISOString(),
          lastTestStatus: ok ? "connected" : "error",
          lastTestError: ok ? null : (error ?? null),
        },
      };
      void saveIntegrations(next).catch(() => undefined);
      return next;
    });
    if (ok) toast({ title: `${PROVIDER_LABEL[id] ?? id} connection OK`, variant: "success" });
    else toast({ title: "Connection failed", description: error, variant: "error" });
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="meta flex items-center gap-2">
        CONFIGURATION SAVED AUTOMATICALLY
        {saving ? <ApertureLoader size={14} /> : null}
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        {(Object.values(map) as ProviderConfig[])
          .sort((a, b) => a.priority - b.priority)
          .map((p) => (
            <ProviderCard key={p.id} provider={p} onChange={update} onTested={onTested} />
          ))}
      </div>
      <p className="meta text-xs font-sans normal-case leading-relaxed tracking-normal">
        Secrets are stored server-side and never rendered back. Spotify playback via the official Web Playback SDK
        requires a Premium account and policy compliance. SoundCloud uses the official public API.
      </p>
    </div>
  );
}


