import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Expo SDK 51+ automatically bundles EXPO_PUBLIC_* variables from .env files
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (supabaseUrl === 'https://placeholder-project.supabase.co' || supabaseAnonKey === 'placeholder-anon-key') {
  console.warn(
    'Supabase configuration placeholders are active. Please create a .env file containing:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=your_supabase_url\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
