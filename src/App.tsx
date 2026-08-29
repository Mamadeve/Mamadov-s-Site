/**
 * MAMADO — app routes. Admin console is additionally guarded in the page.
 */
import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { LoaderScreen } from "@/components/loader/Loader";
import { useAuthStore } from "@/store/auth";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const TasksPage = lazy(() => import("@/pages/TasksPage"));
const MusicPage = lazy(() => import("@/pages/MusicPage"));
const GamesPage = lazy(() => import("@/pages/GamesPage"));
const FocusPage = lazy(() => import("@/pages/FocusPage"));
const ActivityPage = lazy(() => import("@/pages/ActivityPage"));
const StatsPage = lazy(() => import("@/pages/StatsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));

export default function App() {
  const initialized = useAuthStore((s) => s.initialized);
  const loading = useAuthStore((s) => s.loading);
  const sessionUserId = useAuthStore((s) => s.sessionUserId);

  if (!initialized || loading) {
    return <LoaderScreen />;
  }

  if (!sessionUserId) {
    return <AuthPage />;
  }

  return (
    <Suspense fallback={<LoaderScreen label="LOADING ROUTE" />}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="music" element={<MusicPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="focus" element={<FocusPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}