/**
 * MAMADO entry — apply theme, initialize auth, render.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import "@/styles/index.css";
import { useAuthStore } from "@/store/auth";
import { supabase } from "@/lib/supabase";
import { LoaderScreen } from "@/components/loader/Loader";

// Boot auth session before first render.
void useAuthStore.getState().initialize();

// Reflect auth changes (sign-in/out across tabs) into the store.
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((_event, session) => {
    const s = useAuthStore.getState();
    s.setProfile(null);
    // On any sign-in event, refresh identity & profile snapshot.
    const uid = session?.user?.id ?? null;
    if (uid) {
      void useAuthStore.getState().initialize().finally(() => {
        // after initialize, profile is set
      });
    } else {
      useAuthStore.setState({ sessionUserId: null, profile: null });
    }
  });
}

const root = document.getElementById("root");

const OUTER = <div className="min-h-dvh bg-[var(--bg)]"><LoaderScreen label="BOOTING" /></div>;

ReactDOM.createRoot(root!).render(
  <React.StrictMode>
    <BrowserRouter>
      <BootstrapGate />
    </BrowserRouter>
  </React.StrictMode>,
);

function BootstrapGate() {
  const initialized = useAuthStore((s) => s.initialized);
  if (!initialized) {
    return OUTER;
  }
  return <App />;
}