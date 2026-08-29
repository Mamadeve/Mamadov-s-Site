/**
 * MusicApprovals — admin review queue for user-submitted tracks.
 * Approve → the track becomes publicly visible; Reject → hidden from the
 * library (owner still sees its status). Syncs instantly via notifyDataChange.
 */
import { useCallback, useEffect, useState } from "react";
import { Check, Clock, X } from "lucide-react";
import type { TrackWithMeta } from "@/types/database";
import { listTracks, setTrackStatus } from "@/services/music";
import { useToast } from "@/store";
import { notifyDataChange } from "@/hooks/useDataSync";
import { dbErrorMessage } from "@/lib/supabase";
import { Button } from "@/components/ui/primitives";
import { WaveformLoader } from "@/components/ui/CircleLoaders";
import { timeAgo } from "@/lib/utils";

export function MusicApprovals() {
  const toast = useToast();
  const [pending, setPending] = useState<TrackWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await listTracks({});
      setPending(all.filter((t) => t.status === "pending"));
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (track: TrackWithMeta, status: "approved" | "rejected") => {
    setBusyId(track.id);
    try {
      await setTrackStatus(track.id, status);
      setPending((prev) => prev.filter((t) => t.id !== track.id));
      toast({
        title: status === "approved" ? "Track approved" : "Track rejected",
        description: track.title,
        variant: status === "approved" ? "success" : "default",
      });
      notifyDataChange("music_tracks");
    } catch (e) {
      toast({ title: "Action failed", description: dbErrorMessage(e as never), variant: "error" });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <WaveformLoader size={48} label="LOADING QUEUE" />
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="dot-grid-sm flex items-center justify-center gap-2 rounded-[12px] border border-dashed border-line px-4 py-8">
        <Check size={13} className="text-[var(--color-positive)]" />
        <span className="meta normal-case tracking-normal">no submissions waiting for review</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {pending.map((t) => (
        <div
          key={t.id}
          className="glass flex items-center gap-3 rounded-[12px] px-3.5 py-3"
        >
          {t.cover_url ? (
            <img src={t.cover_url} alt="" className="size-10 shrink-0 rounded-lg border border-line object-cover" />
          ) : (
            <div className="dot-grid-sm flex size-10 shrink-0 items-center justify-center rounded-lg border border-line text-[var(--txt-faint)]">
              <Clock size={14} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-[var(--txt)]">{t.title}</p>
            <p className="meta truncate normal-case tracking-normal">
              {t.artist} · {t.source.toUpperCase()} · {timeAgo(t.created_at)}
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            loading={busyId === t.id}
            onClick={() => void decide(t, "approved")}
          >
            <Check size={12} /> Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={busyId === t.id}
            onClick={() => void decide(t, "rejected")}
          >
            <X size={12} /> Reject
          </Button>
        </div>
      ))}
    </div>
  );
}
