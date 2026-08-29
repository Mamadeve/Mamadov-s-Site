/**
 * Music — add/edit track modal with official oEmbed metadata resolution.
 * Any valid https URL is accepted (spotify / soundcloud / apple music /
 * direct audio). Liquid Glass design, cover-image upload, and the admin
 * review workflow (non-admin submissions are published after approval).
 */
import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Link2, Music2, Sparkles, Upload, X } from "lucide-react";
import type { Category, TrackWithMeta } from "@/types/database";
import { Modal } from "@/components/ui/Modal";
import { Button, Input, Textarea, FieldLabel, Select } from "@/components/ui/primitives";
import { ErrorNote } from "@/components/ui/bits";
import { WaveformLoader } from "@/components/ui/CircleLoaders";
import { useAuthStore, useToast } from "@/store";
import {
  addTrack,
  updateTrack,
  uploadAudioFile,
  uploadCoverImage,
  isAudioFile,
  isImageFile,
  countUserDirectUploads,
} from "@/services/music";
import { listCategories } from "@/services/categories";
import { dbErrorMessage } from "@/lib/supabase";
import { detectSource, resolveMetadata, probeDirectDuration } from "@/services/music-providers";
import { notifyDataChange } from "@/hooks/useDataSync";
import { cn } from "@/lib/utils";

/** Non-admin accounts may upload this many audio files (links unlimited). */
const UPLOAD_LIMIT = 1;

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
  const isAdmin = profile?.role === "admin";
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
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadsUsed, setUploadsUsed] = useState(0);

  const isEdit = Boolean(editing);
  const uploadQuotaLeft = Math.max(0, UPLOAD_LIMIT - uploadsUsed);
  const uploadBlocked = !isAdmin && !isEdit && uploadQuotaLeft === 0;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCoverUrl(editing?.cover_url ?? null);
    setTab("link");
    setFile(null);
    setUploadPct(null);
    listCategories().then(setCategories);
    if (profile && !isAdmin) {
      void countUserDirectUploads(profile.id).then(setUploadsUsed);
    }
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
  }, [open, editing, profile, isAdmin]);

  const pickCover = async (f: File) => {
    if (!profile) return;
    if (!isImageFile(f)) {
      setError("Unsupported image — use JPG, PNG, WEBP or AVIF.");
      return;
    }
    setError(null);
    try {
      const { publicUrl } = await uploadCoverImage(f, useAuthStore.getState().sessionUserId ?? profile.id);
      setCoverUrl(publicUrl);
      toast({ title: "Cover image ready" });
    } catch (e) {
      setError(e instanceof Error ? e.message : dbErrorMessage(e as never));
    }
  };

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
        if (!isAdmin) {
          toast({
            title: "Submission received",
            description: "Your track will be published after administrator approval.",
          });
        }
        /* instant global sync — no manual refresh needed */
        notifyDataChange("music_tracks");
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
        if (isAdmin) {
          toast({ title: "Track added", description: payload.title, variant: "success" });
        } else {
          toast({
            title: "Submission received",
            description: "Your track will be published after administrator approval.",
            variant: "success",
          });
        }
      }
      /* instant global sync — no manual refresh needed */
      notifyDataChange("music_tracks");
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
      footer={
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
      }
    >
      <div className="flex flex-col gap-4">
        {!isEdit ? (
          /* source mode tabs — cohesive Liquid Glass segmented control */
          <div className="glass grid grid-cols-2 gap-1 overflow-hidden rounded-[12px] p-1">
            {([
              ["link", <Link2 key="i" size={12} />, "Link"],
              ["upload", <Upload key="i" size={12} />, "Upload file"],
            ] as const).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => { if (id === "upload" && uploadBlocked) return; setTab(id); setError(null); }}
                disabled={id === "upload" && uploadBlocked}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-1.5 rounded-[9px] py-2 text-xs transition-all duration-200",
                  tab === id
                    ? "bg-[var(--panel2)] text-[var(--txt)] shadow-[inset_0_1px_0_var(--glass-highlight)]"
                    : "text-[var(--txt-faint)] hover:text-[var(--txt-dim)]",
                  id === "upload" && uploadBlocked && "cursor-not-allowed opacity-40",
                )}
              >
                {icon} {label.toUpperCase()}
              </button>
            ))}
          </div>
        ) : null}

        {/* upload quota — 1 uploaded file per non-admin account; links unlimited */}
        {!isEdit ? (
          <div className="glass flex items-start gap-2.5 rounded-[12px] px-3.5 py-2.5">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--color-caution)]" />
            <p className="text-[11.5px] leading-relaxed text-[var(--txt-dim)]">
              {uploadBlocked
                ? "You've used your 1 uploaded audio file. Music LINKS remain unlimited — switch to the Link tab."
                : `Uploaded files: ${uploadQuotaLeft} of ${UPLOAD_LIMIT} remaining for your account. Music links are unlimited.`}
            </p>
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

        {/* cover image */}
        <div>
          <FieldLabel>Cover image</FieldLabel>
          <div className="flex items-center gap-3">
            {coverUrl ? (
              <div className="relative shrink-0">
                <img src={coverUrl} alt="Cover preview" className="size-16 rounded-xl border border-line object-cover" />
                <button
                  onClick={() => setCoverUrl(null)}
                  aria-label="Remove cover"
                  className="absolute -right-1.5 -top-1.5 cursor-pointer rounded-full border border-line bg-[var(--panel)] p-0.5 text-[var(--txt-faint)] transition-colors hover:text-[var(--color-negative)]"
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div className="dot-grid-sm flex size-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-line text-[var(--txt-faint)]">
                <ImageIcon size={16} />
              </div>
            )}
            <button
              onClick={() => coverInputRef.current?.click()}
              className="press flex flex-1 cursor-pointer flex-col items-start gap-1 rounded-[10px] border border-dashed border-line px-3.5 py-3 text-left transition-colors hover:border-[color-mix(in_srgb,var(--txt)_35%,var(--line))]"
            >
              <span className="text-xs text-[var(--txt-dim)]">{coverUrl ? "Replace cover image" : "Upload a cover image"}</span>
              <span className="meta normal-case tracking-normal">JPG · PNG · WEBP — optional</span>
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.avif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (f) void pickCover(f);
              }}
            />
          </div>
          <p className="meta mt-1.5 flex items-center gap-2 normal-case tracking-normal">
            <Sparkles size={11} /> artwork & metadata auto-fetched from official embed APIs when available
          </p>
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

        {/* admin review workflow notice — Liquid Glass info card */}
        {!isEdit && !isAdmin ? (
          <div className="glass flex items-start gap-2.5 rounded-[12px] border-[color-mix(in_srgb,var(--color-caution)_30%,var(--glass-line))] px-3.5 py-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-caution)_50%,transparent)] text-[var(--color-caution)]">
              <Music2 size={10} />
            </span>
            <p className="text-[11.5px] leading-relaxed text-[var(--txt-dim)]">
              <span className="font-medium text-[var(--txt)]">Review required.</span>{" "}
              Your music submission will be published on the website only after administrator approval.
            </p>
          </div>
        ) : null}

        {error ? <ErrorNote message={error} /> : null}
      </div>
    </Modal>
  );
}