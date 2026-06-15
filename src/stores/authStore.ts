import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  isOnboarded: boolean | null; // null means undetermined/loading
  
  signInWithOtp: (email: string) => Promise<{ error: any }>;
  verifyOtp: (email: string, token: string) => Promise<{ session: any; error: any }>;
  setGuestMode: (enabled: boolean) => void;
  completeOnboarding: () => Promise<void>;
  signOut: () => Promise<{ error: any }>;
  fetchProfile: (userId: string) => Promise<{ data: Profile | null; error: any }>;
  updateProfile: (updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>) => Promise<{ error: any }>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  isGuest: false,
  isOnboarded: null,

  signInWithOtp: async (email) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      set({ isLoading: false });
      return { error };
    } catch (err: any) {
      console.error('signInWithOtp error:', err.message || err);
      set({ isLoading: false });
      return { error: err };
    }
  },

  verifyOtp: async (email, token) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        set({ isLoading: false });
        return { session: null, error };
      }

      if (data?.user) {
        set({
          user: data.user,
          isAuthenticated: true,
          isGuest: false,
        });
        const { data: profile } = await get().fetchProfile(data.user.id);
        set({ profile, isLoading: false });
        return { session: data.session, error: null };
      }

      set({ isLoading: false });
      return { session: null, error: new Error('Verification failed. No user resolved.') };
    } catch (err: any) {
      console.error('verifyOtp error:', err.message || err);
      set({ isLoading: false });
      return { session: null, error: err };
    }
  },

  setGuestMode: (enabled) => {
    if (enabled) {
      supabase.auth.signOut().catch((err) => {
        console.warn('Sign out in guest mode failed:', err);
      });
    }
    set({
      isGuest: enabled,
      isAuthenticated: false,
      user: null,
      profile: null,
    });
  },

  completeOnboarding: async () => {
    try {
      await AsyncStorage.setItem('kohsar_onboarded', 'true');
      set({ isOnboarded: true });
    } catch (err) {
      console.error('Error saving onboarding status:', err);
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signOut();
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isGuest: false,
        isLoading: false,
      });
      return { error };
    } catch (err: any) {
      console.error('signOut error:', err.message || err);
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isGuest: false,
        isLoading: false,
      });
      return { error: err };
    }
  },

  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error.message);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err: any) {
      console.error('Exception fetching profile:', err.message || err);
      return { data: null, error: err };
    }
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return { error: new Error('User not logged in') };

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        set({ isLoading: false });
        return { error };
      }

      set({ profile: data, isLoading: false });
      return { error: null };
    } catch (err: any) {
      console.error('updateProfile exception:', err.message || err);
      set({ isLoading: false });
      return { error: err };
    }
  },

  checkUsernameAvailable: async (username) => {
    if (username.length < 3) return false;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', username);

      if (error) {
        console.error('Error checking username:', error.message);
        return false;
      }
      return (data || []).length === 0;
    } catch (err: any) {
      console.error('Exception checking username:', err.message || err);
      return false;
    }
  },

  initialize: async () => {
    // Guard against being called twice (StrictMode / Fast Refresh).
    if (initializeStarted) return;
    initializeStarted = true;

    set({ isLoading: true });

    // Load onboarding status
    try {
      const onboarded = await AsyncStorage.getItem('kohsar_onboarded');
      set({ isOnboarded: onboarded === 'true' });
    } catch (err: any) {
      console.error('Error reading onboarding status:', err?.message || err);
      set({ isOnboarded: false });
    }

    let session = null;
    try {
      const sessionResult = await supabase.auth.getSession();
      session = sessionResult.data?.session || null;
    } catch (err: any) {
      console.error('Exception getting initial session:', err?.message || err);
    }

    try {
      if (session?.user) {
        set({ user: session.user, isAuthenticated: true, isGuest: false });
        const { data: profile } = await get().fetchProfile(session.user.id);
        set({ profile });
      }
    } catch (err: any) {
      console.error('Exception setting user from initial session:', err?.message || err);
    }

    // Subscribe to subsequent auth changes. supabase-js fires an INITIAL_SESSION event
    // immediately on subscribe; we skip the first invocation because we already handled it
    // above via getSession(), avoiding a redundant profile fetch and isLoading flap.
    let sawInitialEvent = false;
    try {
      supabase.auth.onAuthStateChange((event, currentSession) => {
        if (!sawInitialEvent) {
          sawInitialEvent = true;
          if (event === 'INITIAL_SESSION') return;
        }
        void handleAuthChange(currentSession, get, set);
      });
    } catch (err: any) {
      console.error('Exception setting up auth state change listener:', err?.message || err);
    }

    set({ isLoading: false });
  },
}));

// Module-level flag prevents duplicate initialize() invocations during Fast Refresh.
let initializeStarted = false;

// Handles non-initial auth state transitions. Keeps the listener body small so any
// thrown exception lands in the global handler with a readable stack.
const handleAuthChange = async (
  currentSession: { user?: User | null } | null,
  get: () => AuthState,
  set: (partial: Partial<AuthState>) => void
) => {
  try {
    if (currentSession?.user) {
      const isDifferentUser = get().user?.id !== currentSession.user.id;
      set({ user: currentSession.user, isAuthenticated: true, isGuest: false });

      if (isDifferentUser || !get().profile) {
        const { data: profile } = await get().fetchProfile(currentSession.user.id);
        set({ profile });
      }
    } else if (!get().isGuest) {
      set({ user: null, profile: null, isAuthenticated: false });
    }
  } catch (err: any) {
    console.error('Exception in auth state change callback:', err?.message || err);
  }
};
