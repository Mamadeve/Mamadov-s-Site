/**
 * AppShell — persistent layout: desktop sidebar / top bar / mobile nav,
 * player, toasts, command palette, shortcuts help. Page transitions included.
 */
import { Suspense, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  CheckSquare,
  Command,
  Gamepad2,
  HelpCircle,
  LayoutDashboard,
  Music,
  Search,
  Settings,
  Shield,
  Timer,
  User,
} from "lucide-react";
import { Loader } from "@/components/loader/Loader";
import { PlayerBar } from "@/components/player/PlayerBar";
import { Toaster } from "@/components/Toaster";
import { CommandPalette } from "@/components/CommandPalette";
import { ShortcutsPanel } from "@/components/ShortcutsPanel";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { APP_VERSION } from "@/config/constants";
import { cn } from "@/lib/utils";
import { StatusDot, Kbd } from "@/components/ui/bits";
import { NewTaskModal } from "@/components/tasks/TaskModal";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/music", label: "Music", icon: Music },
  { to: "/games", label: "Arcade", icon: Gamepad2 },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/stats", label: "Stats", icon: BarChart3 },
];

const MOBILE_NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/music", label: "Music", icon: Music },
  { to: "/profile", label: "You", icon: User },
];

export function AppShell() {
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const isAdmin = useAuthStore((s) => s.profile?.role === "admin");
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen);
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen);
  const location = useLocation();

  useKeyboardShortcuts({
    onNewTask: () => setNewTaskOpen(true),
    onSearch: () => setPaletteOpen(true),
  });

  return (
    <div className="dot-grid min-h-dvh bg-[var(--bg)]">
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-[var(--panel)] md:flex">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="dot-grid-sm flex size-8 items-center justify-center rounded-lg border border-line">
            <span className="display text-[13px] text-[var(--txt)]">M</span>
          </div>
          <div>
            <p className="display text-sm tracking-[0.28em] text-[var(--txt)]">MAMADO</p>
            <p className="meta mt-0.5 normal-case tracking-normal">productivity / music os</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="meta px-2 pb-2">SYSTEM</p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "group mb-0.5 flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] transition-all duration-150",
                  isActive
                    ? "bg-[var(--panel2)] text-[var(--txt)]"
                    : "text-[var(--txt-dim)] hover:bg-[var(--panel2)]/60 hover:text-[var(--txt)]",
                )
              }
            >
              <item.icon size={15} className="text-[var(--txt-faint)]" />
              {item.label}
            </NavLink>
          ))}

          <p className="meta px-2 pb-2 pt-4">ACCOUNT</p>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                "group mb-0.5 flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] transition-all",
                isActive ? "bg-[var(--panel2)] text-[var(--txt)]" : "text-[var(--txt-dim)] hover:bg-[var(--panel2)]/60 hover:text-[var(--txt)]",
              )
            }
          >
            <User size={15} className="text-[var(--txt-faint)]" /> Profile
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "group mb-0.5 flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] transition-all",
                isActive ? "bg-[var(--panel2)] text-[var(--txt)]" : "text-[var(--txt-dim)] hover:bg-[var(--panel2)]/60 hover:text-[var(--txt)]",
              )
            }
          >
            <Settings size={15} className="text-[var(--txt-faint)]" /> Settings
          </NavLink>
          {isAdmin ? (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  "group mb-0.5 flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] transition-all",
                  isActive ? "bg-[var(--panel2)] text-[var(--txt)]" : "text-[var(--txt-dim)] hover:bg-[var(--panel2)]/60 hover:text-[var(--txt)]",
                )
              }
            >
              <Shield size={15} className="text-[var(--txt-faint)]" /> Admin
              <span className="meta ml-auto rounded border border-line px-1 py-px">ROOT</span>
            </NavLink>
          ) : null}
        </nav>

        {/* footer / branding */}
        <div className="border-t border-line px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="meta flex items-center gap-2">
              <StatusDot /> SYSTEM ONLINE
            </span>
            <span className="meta">V{APP_VERSION}</span>
          </div>
          <p className="meta mt-2 normal-case tracking-normal">// designed by Mamadov</p>
        </div>
      </aside>
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 border-b border-line bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] backdrop-blur-md md:pl-56">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <div className="dot-grid-sm flex size-7 items-center justify-center rounded-md border border-line">
              <span className="display text-[11px] text-[var(--txt)]">M</span>
            </div>
            <span className="display text-xs tracking-[0.28em] text-[var(--txt)]">MAMADO</span>
          </div>

          <button
            onClick={() => setPaletteOpen(true)}
            className={cn(
              "group ml-auto hidden h-8 cursor-pointer items-center gap-2.5 rounded-[10px] border border-line",
              "bg-[var(--panel)] px-3 text-xs text-[var(--txt-faint)] transition-colors",
              "hover:border-[color-mix(in_srgb,var(--txt)_30%,var(--line))] hover:text-[var(--txt-dim)] md:flex",
            )}
          >
            <Search size={12} />
            <span>Search or jump to…</span>
            <span className="ml-6 flex items-center gap-0.5">
              <Kbd>CTRL</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Open command palette"
            className="ml-auto cursor-pointer rounded-lg border border-line p-2 text-[var(--txt-dim)] transition-colors hover:text-[var(--txt)] md:hidden"
          >
            <Command size={15} />
          </button>
          <button
            onClick={() => setShortcutsOpen(true)}
            aria-label="Keyboard shortcuts"
            className="hidden cursor-pointer rounded-lg border border-line p-2 text-[var(--txt-faint)] transition-colors hover:text-[var(--txt)] sm:block"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="px-4 pb-40 pt-6 md:ml-56 md:px-8 md:pb-28">
        <div className="mx-auto max-w-6xl">
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <Loader size={72} />
              </div>
            }
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>

            <footer className="mt-16 hidden items-center justify-center border-t border-dashed border-line pb-2 pt-6 md:flex">
              <span className="meta normal-case tracking-normal">
                {"<"} crafted by <span className="text-[var(--txt-dim)]">Mamadov</span> /{">"} — mamado os v{APP_VERSION}
              </span>
            </footer>
          </Suspense>
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed inset-x-0 bottom-[62px] z-30 flex h-14 items-stretch border-t border-line bg-[var(--panel)] md:hidden">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 font-mono text-[9px] tracking-wider transition-colors",
                isActive ? "text-[var(--txt)]" : "text-[var(--txt-faint)]",
              )
            }
          >
            <item.icon size={17} strokeWidth={1.7} />
            {item.label.toUpperCase()}
          </NavLink>
        ))}
      </nav>

      {/* global overlays */}
      <PlayerBar />
      <CommandPalette onNewTask={() => setNewTaskOpen(true)} />
      <ShortcutsPanel />
      <Toaster />
      <NewTaskModal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} />
    </div>
  );
}
