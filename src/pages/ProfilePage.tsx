/**
 * ProfilePage — manage your own profile & preferences.
 */
import { useEffect, useState } from "react";
import { LogOut, Save } from "lucide-react";
import { useAuthStore, useToast } from "@/store";
import { updateProfile } from "@/services/auth";
import { saveLocalPrefs } from "@/services/auth";
import { dbErrorMessage } from "@/lib/supabase";
import { Button, Input, Textarea, FieldLabel } from "@/components/ui/primitives";
import { Badge, ErrorNote } from "@/components/ui/bits";
import { initials } from "@/lib/utils";
import type { UserPreferences } from "@/types/database";

export default function ProfilePage() {
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const toast = useToast();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState<"dark" | "light" | "mono">("dark");
  const [view, setView] = useState<"board" | "list">("board");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    try {
      const prefs = JSON.parse(localStorage.getItem("mamado.prefs") ?? "{}") as UserPreferences;
      if (prefs.theme) setTheme(prefs.theme ?? "dark");
      if (prefs.defaultTaskView) setView(prefs.defaultTaskView);
    } catch {
      /* noop */
    }
  }, [profile]);

  if (!profile) return null;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile(profile.id, {
        display_name: displayName.trim() || null,
        username: username.trim() || null,
        bio: bio.trim() || null,
      });
      await refreshProfile();
      const prefs: UserPreferences = { theme, defaultTaskView: view, accentTimer: true };
      saveLocalPrefs(prefs);
      toast({ title: "Profile saved", variant: "success" });
    } catch (e) {
      setError(dbErrorMessage(e as never));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-rise">
      <div className="mb-8 flex items-center gap-4">
        <div className="dot-grid-sm flex size-14 items-center justify-center rounded-2xl border border-line text-lg">
          <span className="display text-xl text-[var(--txt)]">{initials(profile.display_name ?? profile.username)}</span>
        </div>
        <div>
          <h1 className="display text-2xl tracking-wide text-[var(--txt)]">
            {profile.display_name ?? profile.username ?? "User"}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge>{profile.role.toUpperCase()}</Badge>
            <span className="meta">#ID {profile.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      <div className="card-surface flex flex-col gap-4 p-5">
        <div>
          <FieldLabel>Display name</FieldLabel>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Username</FieldLabel>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="handle" />
        </div>
        <div>
          <FieldLabel>Bio</FieldLabel>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A few words about yourself…" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Theme</FieldLabel>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as typeof theme)}
              className="h-9 w-full rounded-[10px] border border-line bg-[var(--panel2)] px-3 text-[13px] focus:outline-none"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="mono">Mono (experimental)</option>
            </select>
          </div>
          <div>
            <FieldLabel>Default task view</FieldLabel>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as typeof view)}
              className="h-9 w-full rounded-[10px] border border-line bg-[var(--panel2)] px-3 text-[13px] focus:outline-none"
            >
              <option value="board">Kanban</option>
              <option value="list">List</option>
            </select>
          </div>
        </div>

        {error ? <ErrorNote message={error} /> : null}

        <div className="mt-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut size={13} /> Sign out
          </Button>
          <Button variant="primary" size="sm" loading={saving} onClick={() => void save()}>
            <Save size={13} /> Save profile
          </Button>
        </div>
      </div>
    </div>
  );
}