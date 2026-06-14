import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env variables');
}

const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message === 'Aborted') {
      console.warn('Supabase fetch aborted, suppressing to prevent crash.');
      return new Response(JSON.stringify({ error: 'Aborted' }), {
        status: 499,
        statusText: 'Client Closed Request',
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw err;
  }
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
