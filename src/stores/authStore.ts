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
  isGuest: boolean;
  
  signInWithOtp: (email: string) => Promise<{ error: any }>;
  verifyOtp: (email: string, token: string) => Promise<{ session: any; error: any }>;
  setGuestMode: (enabled: boolean) => void;
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

  signInWithOtp: async (email) => {
    set({ isLoading: true });
    
    // Request email OTP (One-Time Password)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // Auto-registers new users
      },
    });

    set({ isLoading: false });
    return { error };
  },

  verifyOtp: async (email, token) => {
    set({ isLoading: true });
    
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
        isGuest: false, // End guest mode if they authenticate
      });
      
      // Fetch user profile details
      const { data: profile } = await get().fetchProfile(data.user.id);
      set({ profile, isLoading: false });
      return { session: data.session, error: null };
    }

    set({ isLoading: false });
    return { session: null, error: new Error('Verification failed. No user resolved.') };
  },

  setGuestMode: (enabled) => {
    set({
      isGuest: enabled,
      isAuthenticated: false,
      user: null,
      profile: null,
    });
  },

  signOut: async () => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signOut();
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuest: false,
      isLoading: false,
    });
    return { error };
  },

  fetchProfile: async (userId) => {
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
  },

  updateProfile: async (updates) => {
    const { user } = get();
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

  checkUsernameAvailable: async (username) => {
    if (username.length < 3) return false;
    
    // Check if any profile matches this username (case-insensitive)
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', username);

    if (error) {
      console.error('Error checking username:', error.message);
      return false;
    }

    return (data || []).length === 0;
  },

  initialize: async () => {
    set({ isLoading: true });
    
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      set({ user: session.user, isAuthenticated: true, isGuest: false });
      const { data: profile } = await get().fetchProfile(session.user.id);
      set({ profile });
    }

    // Set up auth state change listener
    supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (currentSession?.user) {
        const isDifferentUser = get().user?.id !== currentSession.user.id;
        set({ user: currentSession.user, isAuthenticated: true, isGuest: false });
        
        if (isDifferentUser || !get().profile) {
          const { data: profile } = await get().fetchProfile(currentSession.user.id);
          set({ profile });
        }
      } else {
        // Only clear auth if guest mode is not active
        if (!get().isGuest) {
          set({ user: null, profile: null, isAuthenticated: false });
        }
      }
      set({ isLoading: false });
    });

    set({ isLoading: false });
  },
}));
