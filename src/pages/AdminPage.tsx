/**
 * AdminPage — owner/admin console. Protected at RLS + route level.
 * Manage users, roles, categories, and application settings.
 */
import { useCallback, useEffect, useState } from "react";
import { FolderTree, Music, Plug, Settings2, ShieldCheck, Trash2, Users } from "lucide-react";
import type { Category, Profile, UserRole } from "@/types/database";
import { useAuthStore, useToast } from "@/store";
import { listUsers, setUserRole, listAppSettings, setAppSetting, deleteAppSetting } from "@/services/admin";
import { listCategories, createCategory, deleteCategory } from "@/services/categories";
import { dbErrorMessage } from "@/lib/supabase";
import { Badge, EmptyState, ErrorNote } from "@/components/ui/bits";
import { Button, Input } from "@/components/ui/primitives";
import { IntegrationsCenter } from "@/components/admin/IntegrationsCenter";
import { MusicApprovals } from "@/components/admin/MusicApprovals";
import { timeAgo, initials } from "@/lib/utils";
import { Loader } from "@/components/loader/Loader";
import { APP_VERSION } from "@/config/constants";

export default function AdminPage() {
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === "admin";
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState("");
  const [settingKey, setSettingKey] = useState("");
  const [settingValue, setSettingValue] = useState("");

  const load = useCallback(async () => {
    const [u, c, s] = await Promise.all([listUsers(), listCategories(), listAppSettings()]);
    setUsers(u);
    setCategories(c);
    setSettings(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
    else setLoading(false);
  }, [isAdmin, load]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader size={64} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <CanNotAdmin />
    );
  }

  const changeRole = async (id: string, role: UserRole) => {
    try {
      await setUserRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
      toast({ title: `Role set to ${role.toUpperCase()}`, variant: "success" });
    } catch (e) {
      toast({ title: "Couldn't change role", description: dbErrorMessage(e as never), variant: "error" });
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await createCategory(newCategory.trim(), null, null);
      setNewCategory("");
      setCategories(await listCategories());
      toast({ title: "Category created", variant: "success" });
    } catch (e) {
      setError(dbErrorMessage(e as never));
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Category removed" });
    } catch (e) {
      toast({ title: "Couldn't remove category", description: dbErrorMessage(e as never), variant: "error" });
    }
  };

  const saveSetting = async () => {
    if (!settingKey.trim()) return;
    let value: unknown = settingValue;
    try { value = JSON.parse(settingValue); } catch { /* keep string */ }
    try {
      await setAppSetting(settingKey.trim(), value);
      setSettings((prev) => ({ ...prev, [settingKey.trim()]: value }));
      setSettingKey("");
      setSettingValue("");
      toast({ title: "Setting saved", variant: "success" });
    } catch (e) {
      setError(dbErrorMessage(e as never));
    }
  };

  return (
    <div className="animate-rise">
      <div className="mb-8 flex items-center gap-3">
        <div className="glass-panel glass-sheen flex size-11 items-center justify-center rounded-xl">
          <ShieldCheck size={18} className="text-[var(--txt)]" />
        </div>
        <div>
          <h1 className="display text-2xl tracking-wide text-[var(--txt)]">ADMIN CONSOLE</h1>
          <p className="meta mt-1">SYSTEM CONTROL · ROOT ACCESS · V{APP_VERSION}</p>
        </div>
      </div>

      {error ? <div className="mb-4"><ErrorNote message={error} /></div> : null}

      {/* music review queue — user submissions awaiting approval */}
      <section className="glass-panel glass-sheen mb-6 rounded-[var(--radius-card)] p-5">
        <h2 className="meta mb-4 flex items-center gap-2"><Music size={13} /> Music review queue · user submissions</h2>
        <MusicApprovals />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-surface glass-sheen p-5">
          <h2 className="meta mb-4 flex items-center gap-2">
            <Users size={13} /> MEMBERS — {users.length}
          </h2>
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl border border-line/60 px-3 py-2.5">
                <div className="dot-grid-sm flex size-9 shrink-0 items-center justify-center rounded-lg border border-line">
                  <span className="display text-[13px] text-[var(--txt)]">{initials(u.display_name ?? u.username)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-[var(--txt)]">{u.display_name ?? u.username ?? "user"}</p>
                  <p className="meta">{u.id.slice(0, 8)} · joined {timeAgo(u.created_at)}</p>
                </div>
                <Badge>{(u.role ?? "user").toUpperCase()}</Badge>
                <Button size="sm" onClick={() => void changeRole(u.id, u.role === "admin" ? "user" : "admin")}>
                  {u.role === "admin" ? "Demote" : "Promote"}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* integrations — API center */}
        <section className="card-surface glass-sheen p-5">
          <h2 className="meta mb-4 flex items-center gap-2"><Plug size={13} /> API Center · Integrations</h2>
          <IntegrationsCenter />
        </section>

        <div className="mt-8 flex flex-col gap-6">
          {/* categories */}
          <section className="card-surface glass-sheen p-5">
            <h2 className="meta mb-4 flex items-center gap-2"><FolderTree size={13} /> Categories</h2>
            <div className="mb-3 flex gap-2">
              <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void addCategory()} placeholder="New category…" />
              <Button variant="primary" onClick={() => void addCategory()}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.length === 0 ? (
                <span className="meta">NO CATEGORIES</span>
              ) : (
                categories.map((c) => (
                  <span key={c.id} className="group inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-[var(--txt-dim)]">
                    <span className="size-1.5 rounded-full" style={{ background: c.color ?? "var(--txt-faint)" }} />
                    {c.name}
                    <button onClick={() => void removeCategory(c.id)} aria-label="Remove" className="cursor-pointer text-[var(--txt-faint)] opacity-0 transition-opacity hover:text-[var(--color-negative)] group-hover:opacity-100">×</button>
                  </span>
                ))
              )}
            </div>
          </section>

          {/* settings */}
          <section className="card-surface glass-sheen p-5">
            <h2 className="meta mb-4 flex items-center gap-2"><Settings2 size={13} /> Application settings</h2>
            <div className="mb-3 space-y-2">
              <Input value={settingKey} onChange={(e) => setSettingKey(e.target.value)} placeholder="Key (e.g. allow_music_from_anyone)" />
              <Input value={settingValue} onChange={(e) => setSettingValue(e.target.value)} placeholder="Value (JSON or text)" onKeyDown={(e) => e.key === "Enter" && void saveSetting()} />
              <Button variant="primary" onClick={() => void saveSetting()}>Save setting</Button>
            </div>
            <div className="flex flex-col gap-1.5">
              {Object.keys(settings).length === 0 ? (
                <span className="meta">NO CUSTOM SETTINGS</span>
              ) : (
                Object.entries(settings).map(([k, v]) => (
                  <div key={k} className="group flex items-center justify-between gap-3 rounded-lg border border-line/60 px-3 py-2">
                    <span className="truncate font-mono text-xs text-[var(--txt-dim)]">{k}</span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-mono text-xs text-[var(--txt-faint)]">{String(v)}</span>
                      <button
                        onClick={async () => {
                          try {
                            await deleteAppSetting(k);
                            setSettings((prev) => {
                              const next = { ...prev };
                              delete next[k];
                              return next;
                            });
                            toast({ title: "Setting removed" });
                          } catch (e) {
                            toast({ title: "Couldn't remove setting", description: dbErrorMessage(e as never), variant: "error" });
                          }
                        }}
                        aria-label={`Delete ${k}`}
                        className="cursor-pointer p-1 text-[var(--txt-faint)] opacity-0 transition-opacity hover:text-[var(--color-negative)] group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function CanNotAdmin() {
  return (
    <div className="mx-auto max-w-md py-16">
      <EmptyState
        icon={<ShieldCheck size={16} />}
        title="ACCESS RESTRICTED"
        description="This console is reserved for the administrator. Your session lacks the required role."
      />
    </div>
  );
}