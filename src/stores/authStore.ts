import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string, fullName?: string, city?: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  fetchProfile: (userId: string) => Promise<{ data: Profile | null; error: any }>;
  updateProfile: (updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>) => Promise<{ error: any }>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  signIn: async (email, password) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      set({ isLoading: false });
      return { error };
    }
    if (data?.user) {
      set({ user: data.user, isAuthenticated: true });
      const { data: profile } = await get().fetchProfile(data.user.id);
      set({ profile, isLoading: false });
    } else {
      set({ isLoading: false });
    }
    return { error: null };
  },

  signUp: async (email, password, username, fullName = '', city = '') => {
    set({ isLoading: true });
    // Supabase trigger will automatically insert into profiles table using metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName,
          city,
        },
      },
    });

    if (error) {
      set({ isLoading: false });
      return { error };
    }

    if (data?.user) {
      set({ user: data.user, isAuthenticated: true });
      // Give a tiny moment for trigger to run and then fetch profile
      let profileData = null;
      let retries = 3;
      while (retries > 0) {
        const { data: profile, error: profileErr } = await get().fetchProfile(data.user.id);
        if (profile) {
          profileData = profile;
          break;
        }
        // Wait 500ms and try again if trigger was slow
        await new Promise((resolve) => setTimeout(resolve, 500));
        retries--;
      }
      set({ profile: profileData, isLoading: false });
    } else {
      set({ isLoading: false });
    }
    return { error: null };
  },

  signOut: async () => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signOut();
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
    });
    return { error };
  },

  fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error.message);
      return { data: null, error };
    }
    return { data, error: null };
  },

  updateProfile: async (updates) => {
    const { user, profile } = get();
    if (!user) return { error: new Error('User not logged in') };

    set({ isLoading: true });
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
  },

  initialize: async () => {
    set({ isLoading: true });
    
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      set({ user: session.user, isAuthenticated: true });
      const { data: profile } = await get().fetchProfile(session.user.id);
      set({ profile });
    }

    // Set up auth state change listener
    supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (currentSession?.user) {
        const isDifferentUser = get().user?.id !== currentSession.user.id;
        set({ user: currentSession.user, isAuthenticated: true });
        
        if (isDifferentUser || !get().profile) {
          const { data: profile } = await get().fetchProfile(currentSession.user.id);
          set({ profile });
        }
      } else {
        set({ user: null, profile: null, isAuthenticated: false });
      }
      set({ isLoading: false });
    });

    set({ isLoading: false });
  },
}));
