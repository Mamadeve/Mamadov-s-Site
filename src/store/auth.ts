/**
 * Store — authentication & current user session
 */
import { create } from "zustand";
import type { Profile } from "@/types/database";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fetchProfile } from "@/services/auth";

interface AuthState {
  sessionUserId: string | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  sessionUserId: null,
  profile: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false, initialized: true });
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id ?? null;
      set({ sessionUserId: userId });
      if (userId) {
        const profile = await fetchProfile(userId);
        set({ profile });
      } else {
        set({ profile: null });
      }
    } catch {
      // offline / network — stay signed out gracefully
      set({ sessionUserId: null, profile: null });
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  refreshProfile: async () => {
    const uid = get().sessionUserId;
    if (!uid) return;
    const profile = await fetchProfile(uid);
    set({ profile });
  },

  setProfile: (profile) => set({ profile }),

  signOut: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    set({ sessionUserId: null, profile: null });
  },
}));

export const selectIsAdmin = (s: AuthState) => s.profile?.role === "admin";
