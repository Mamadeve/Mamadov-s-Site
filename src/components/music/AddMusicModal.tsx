/**
 * Music — add/edit track modal with official oEmbed metadata resolution.
 * Any valid https URL is accepted (spotify / soundcloud / direct audio).
 */
import { useEffect, useRef, useState } from "react";
import { Link2, Music2, Sparkles, Upload } from "lucide-react";
import type { Category, TrackWithMeta } from "@/types/database";
import { Modal } from "@/components/ui/Modal";
import { Button, Input, Textarea, FieldLabel, Select } from "@/components/ui/primitives";
import { ErrorNote } from "@/components/ui/bits";
import { WaveformLoader } from "@/components/ui/CircleLoaders";
import { useAuthStore, useToast } from "@/store";
import { addTrack, updateTrack, uploadAudioFile, isAudioFile } from "@/services/music";
import { listCategories } from "@/services/categories";
import { dbErrorMessage } from "@/lib/supabase";
import { detectSource, resolveMetadata, probeDirectDuration } from "@/services/music-providers";
import { cn } from "@/lib/utils";

export function AddMusicModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: TrackWithMeta | null;
}) {
  const profile = useAuthStore((s) => s.profile);
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* upload mode */
  const [tab, setTab] = useState<"link" | "upload">("link");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(editing);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCoverUrl(editing?.cover_url ?? null);
    setTab("link");
    setFile(null);
    setUploadPct(null);
    listCategories().then(setCategories);
    if (editing) {
      setUrl(editing.source_url);
      setTitle(editing.title);
      setArtist(editing.artist);
      setAlbum(editing.album ?? "");
      setNotes(editing.notes ?? "");
      setCategoryId(editing.category_id ?? "");
    } else {
      setUrl(""); setTitle(""); setArtist(""); setAlbum(""); setNotes(""); setCategoryId("");
    }
  }, [open, editing]);

  const tryResolve = async () => {
    const clean = url.trim();
    if (!clean || clean === editing?.source_url) return;
    setResolving(true);
    try {
      const meta = await resolveMetadata(clean);
      if (meta.title) setTitle((t) => t || meta.title || "");
      if (meta.artist) setArtist((a) => a || meta.artist || "");
      if (meta.coverUrl) setCoverUrl((c) => c || meta.coverUrl || null);
    } catch {
      /* silent — keep manual fields */
    } finally {
      setResolving(false);
    }
  };
  const submit = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      if (tab === "upload") {
        /* direct file upload → storage → library */
        if (!file) {
          setSaving(false);
          return;
        }
        setUploadPct(0);
        const folderOwner = useAuthStore.getState().sessionUserId ?? profile.id;
        const { publicUrl } = await uploadAudioFile(file, folderOwner, setUploadPct);
        const duration = await probeDirectDuration(publicUrl);
        await addTrack(
          {
            title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
            artist: artist.trim() || "Unknown artist",
            album: album.trim() || null,
            cover_url: coverUrl,
            source: "direct",
            source_url: publicUrl,
            duration_seconds: duration,
            notes: notes.trim() || null,
            category_id: categoryId || null,
          } as never,
          profile.id,
        );
        toast({ title: "Track uploaded", description: file.name, variant: "success" });
        onClose();
        return;
      }
      if (!url.trim()) {
        setSaving(false);
        return;
      }
      const source = detectSource(url.trim()) ?? "direct";
      const payload = {
        title: title.trim() || url.trim(),
        artist: artist.trim() || "Unknown artist",
        album: album.trim() || null,
        cover_url: coverUrl,
        source,
        source_url: url.trim(),
        duration_seconds: null,
        notes: notes.trim() || null,
        category_id: categoryId || null,
      };
      if (isEdit && editing) {
        await updateTrack(editing.id, payload as never);
        toast({ title: "Track updated", variant: "success" });
      } else {
        await addTrack(payload as never, profile.id);
        toast({ title: "Track added", description: payload.title, variant: "success" });
      }
      onClose();
    } catch (e) {
      setError(dbErrorMessage(e as never));
    } finally {
      setSaving(false);
      setUploadPct(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "EDIT TRACK" : "ADD MUSIC"}
      subtitle={isEdit ? "EDIT METADATA" : "LINK / DIRECT UPLOAD"}
    >
      <div className="flex flex-col gap-4">
        {!isEdit ? (
          /* source mode tabs — cohesive segmented control */
          <div className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-line text-xs">
            {([
              ["link", <Link2 key="i" size={12} />, "Link"],
              ["upload", <Upload key="i" size={12} />, "Upload file"],
            ] as const).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => { setTab(id); setError(null); }}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-1.5 py-2 transition-colors",
                  tab === id ? "bg-[var(--panel2)] text-[var(--txt)]" : "text-[var(--txt-faint)] hover:text-[var(--txt-dim)]",
                )}
              >
                {icon} {label.toUpperCase()}
              </button>
            ))}
          </div>
        ) : null}

        {tab === "link" || isEdit ? (
          <div>
            <FieldLabel htmlFor="music-url">Source URL</FieldLabel>
            <div className="flex gap-2">
              <Input id="music-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://open.spotify.com/track/… or soundcloud.com/…" />
              <Button variant="outline" loading={resolving} onClick={() => void tryResolve()} title="Fetch metadata via official oEmbed">
                <Sparkles size={13} /> {resolving ? "Fetching…" : "Fetch"}
              </Button>
            </div>
            <p className="meta mt-1.5 normal-case tracking-normal">
              {detectSource(url.trim()) ? `DETECTED: ${detectSource(url.trim())!.toUpperCase()}` : "PASTE A LINK TO AUTO-DETECT SOURCE"}
            </p>
          </div>
        ) : (
          <div>
            <FieldLabel>Audio file — MP3 / WAV / OGG / M4A</FieldLabel>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "dot-grid-sm flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed px-4 py-8 transition-colors",
                "hover:border-[color-mix(in_srgb,var(--txt)_35%,var(--line))]",
              )}
            >
              {file ? (
                <>
                  <Music2 size={16} className="text-[var(--txt)]" />
                  <span className="text-xs text-[var(--txt)]">{file.name}</span>
                  <span className="meta">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                </>
              ) : (
                <>
                  <Upload size={16} className="text-[var(--txt-faint)]" />
                  <span className="text-xs text-[var(--txt-dim)]">Click to choose an audio file</span>
                  <span className="meta">STORED IN SUPABASE STORAGE</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && !isAudioFile(f)) {
                  setError("Unsupported file — use MP3, WAV, OGG or M4A.");
                  return;
                }
                setError(null);
                setFile(f);
                if (f && !title.trim()) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
              }}
            />
            {uploadPct !== null ? (
              <div className="mt-2">
                <div className="h-1 overflow-hidden rounded-full bg-[var(--line)]">
                  <div className="h-full bg-[var(--txt)] transition-[width] duration-200" style={{ width: `${uploadPct}%` }} />
                </div>
                <p className="meta mt-1 flex items-center gap-2">
                  {uploadPct < 100 ? `UPLOADING ${uploadPct}%` : "PROCESSING…"}
                  {uploadPct < 100 ? <WaveformLoader size={12} /> : null}
                </p>
              </div>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Title</FieldLabel>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Track title" />
          </div>
          <div>
            <FieldLabel>Artist</FieldLabel>
            <Input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist" />
          </div>
        </div>

        <div className="flex items-center gap-2 text-[var(--txt-faint)]">
          <Music2 size={13} />
          <span className="meta normal-case tracking-normal">cover artwork & metadata fetched from official embed APIs when available</span>
          <Sparkles size={12} />
        </div>

        <div>
          <FieldLabel>Album</FieldLabel>
          <Input value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Optional" />
        </div>

        <div>
          <FieldLabel>Category</FieldLabel>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <FieldLabel>Notes</FieldLabel>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context…" />
        </div>

        {error ? <ErrorNote message={error} /> : null}

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            className="flex-1"
            loading={saving}
            disabled={tab === "upload" && !isEdit ? !file : !url.trim()}
            onClick={() => void submit()}
          >
            {isEdit ? "Save changes" : tab === "upload" ? "Upload to library" : "Add to library"}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}