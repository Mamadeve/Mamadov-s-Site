/**
 * CommandPalette — Ctrl+K. Search across navigation, tasks, music,
 * and quick actions. Keyboard driven: ↑/↓ navigate, Enter run, Esc close.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  CheckSquare,
  Disc3,
  LayoutDashboard,
  LogOut,
  Music,
  Play,
  Plus,
  Search,
  Settings,
  Shield,
  Timer,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { usePlayerStore } from "@/store/player";
import { listTasks } from "@/services/tasks";
import { listTracks } from "@/services/music";
import type { TaskWithMeta, TrackWithMeta } from "@/types/database";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/bits";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  keywords?: string;
  group: string;
  run: () => void;
}

export function CommandPalette({
  onNewTask,
}: {
  onNewTask?: () => void;
}) {
  const open = useUIStore((s) => s.paletteOpen);
  const setOpen = useUIStore((s) => s.setPaletteOpen);
  const isAdmin = useAuthStore((s) => s.profile?.role === "admin");
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const playTrack = usePlayerStore((s) => s.playTrack);

  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [tasks, setTasks] = useState<TaskWithMeta[]>([]);
  const [tracks, setTracks] = useState<TrackWithMeta[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Load data when opened */
  useEffect(() => {
    if (!open || !profile) return;
    setQuery("");
    setCursor(0);
    setLoadingData(true);
    Promise.all([
      listTasks({ userId: profile.id }).catch(() => []),
      listTracks({ userId: profile.id }).catch(() => []),
    ]).then(([t, m]) => {
      setTasks(t.slice(0, 40));
      setTracks(m.slice(0, 40));
      setLoadingData(false);
    });
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open, profile]);

  const close = useCallback(() => setOpen(false), [setOpen]);

  const commands = useMemo<Command[]>(() => {
    const nav = (path: string): Command["run"] => () => {
      navigate(path);
      close();
    };
    const cmds: Command[] = [
      { id: "new-task", label: "New task", hint: "N", icon: <Plus size={14} />, group: "Actions", run: () => { close(); onNewTask?.(); } },
      { id: "nav-dash", label: "Dashboard", icon: <LayoutDashboard size={14} />, group: "Navigate", run: nav("/") },
      { id: "nav-tasks", label: "Tasks", icon: <CheckSquare size={14} />, group: "Navigate", run: nav("/tasks") },
      { id: "nav-music", label: "Music", icon: <Music size={14} />, group: "Navigate", run: nav("/music") },
      { id: "nav-focus", label: "Focus mode", icon: <Timer size={14} />, group: "Navigate", run: nav("/focus") },
      { id: "nav-activity", label: "Activity", icon: <Activity size={14} />, group: "Navigate", run: nav("/activity") },
      { id: "nav-stats", label: "Statistics", icon: <BarChart3 size={14} />, group: "Navigate", run: nav("/stats") },
      { id: "nav-profile", label: "Profile", icon: <User size={14} />, group: "Navigate", run: nav("/profile") },
      { id: "nav-settings", label: "Settings", icon: <Settings size={14} />, group: "Navigate", run: nav("/settings") },
      {
        id: "signout",
        label: "Sign out",
        icon: <LogOut size={14} />,
        group: "Actions",
        run: () => {
          void useAuthStore.getState().signOut();
          close();
        },
      },
    ];
    if (isAdmin) {
      cmds.push({
        id: "nav-admin",
        label: "Admin console",
        icon: <Shield size={14} />,
        group: "Admin",
        run: nav("/admin"),
      });
    }
    return cmds;
  }, [isAdmin, navigate, close, onNewTask]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchCmds = commands.filter(
      (c) =>
        !q ||
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.keywords?.toLowerCase().includes(q),
    );
    if (!q) return matchCmds;

    const taskCmds: Command[] = tasks
      .filter((t) => t.title.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q)))
      .slice(0, 6)
      .map((t) => ({
        id: `task-${t.id}`,
        label: t.title,
        hint: t.status.replace("_", " "),
        icon: <CheckSquare size={14} />,
        group: "Tasks",
        run: () => {
          navigate("/tasks");
          close();
        },
      }));

    const trackCmds: Command[] = tracks
      .filter((m) => `${m.title} ${m.artist}`.toLowerCase().includes(q))
      .slice(0, 6)
      .map((m) => ({
        id: `track-${m.id}`,
        label: `${m.title} — ${m.artist}`,
        hint: "play",
        icon: <Play size={14} />,
        group: "Music",
        run: () => {
          playTrack(m, tracks);
          close();
        },
      }));

    return [...taskCmds, ...trackCmds, ...matchCmds];
  }, [query, commands, tasks, tracks, navigate, close, playTrack]);
  /* keyboard nav */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[cursor]?.run();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, filtered, cursor, close]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (typeof document === "undefined") return null;

  let lastGroup = "";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" onClick={close} aria-hidden />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.995 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-[var(--panel)] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={15} className="shrink-0 text-[var(--txt-faint)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks, music, commands…"
                className="h-12 w-full bg-transparent text-sm text-[var(--txt)] placeholder:text-[var(--txt-faint)] focus:outline-none"
                aria-label="Command search"
              />
              <Kbd>ESC</Kbd>
            </div>

            <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="meta">{loadingData ? "SYNCING…" : "NO RESULTS"}</p>
                </div>
              ) : (
                filtered.map((c, i) => {
                  const showGroup = c.group !== lastGroup;
                  lastGroup = c.group;
                  return (
                    <div key={c.id}>
                      {showGroup ? <p className="meta px-3 pb-1 pt-3">{c.group}</p> : null}
                      <button
                        data-idx={i}
                        onMouseMove={() => setCursor(i)}
                        onClick={c.run}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-left",
                          "transition-colors duration-100",
                          i === cursor
                            ? "text-[var(--txt)]"
                            : "text-[var(--txt-dim)] hover:text-[var(--txt)]",
                        )}
                        style={i === cursor ? { background: "var(--panel2)" } : undefined}
                      >
                        <span className="text-[var(--txt-faint)]">{c.icon}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px]">{c.label}</span>
                        {c.hint ? <span className="meta">{c.hint}</span> : null}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Disc3 size={12} className="text-[var(--txt-faint)]" />
                <span className="meta normal-case tracking-normal">// mamado command line</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Kbd>↑↓</Kbd>
                <Kbd>↵</Kbd>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
