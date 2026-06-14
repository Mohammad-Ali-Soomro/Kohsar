import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env variables');
}

const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
  const safeOptions = { ...options };
  if (safeOptions.signal) {
    delete safeOptions.signal;
  }
  // Return the standard fetch promise. 
  // By stripping the signal, we guarantee whatwg-fetch will never trigger its onabort handler
  // and thus will never throw an uncatchable DOMException/AbortError.
  return fetch(url, safeOptions);
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: customFetch,
  },
});
