import { AppState, Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { sessionStore } from '@/services/session-store';
import type { Database } from '@/types/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

const AUTH_STORAGE_KEY = 'sb-supabase-auth';

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  client = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      storage: sessionStore,
      storageKey: AUTH_STORAGE_KEY,
    },
  });

  // Supabase RN guidance: only run the refresh timer while foregrounded.
  if (Platform.OS !== 'web') {
    const c = client;
    if (AppState.currentState === 'active') c.auth.startAutoRefresh();
    AppState.addEventListener('change', (state) => {
      if (state === 'active') c.auth.startAutoRefresh();
      else c.auth.stopAutoRefresh();
    });
  }
  return client;
}
