import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase';
import { errorMessage } from '@/utils/helpers';

WebBrowser.maybeCompleteAuthSession();

/** True when cloud auth is set up, so the app must gate on an account. */
export const isAccountRequired = () => isSupabaseConfigured();

/** Supabase's default minimum; keep in sync with Auth → Providers → Email. */
export const ACCOUNT_PASSWORD_MIN = 6;

const NOT_CONFIGURED = 'Supabase is not configured. Add your keys to .env.local';

export type SupabaseAuthStatus = 'uninitialized' | 'signedOut' | 'signedIn';

type Client = NonNullable<ReturnType<typeof getSupabase>>;

interface SupabaseAuthState {
  status: SupabaseAuthStatus;
  user: User | null;
  session: Session | null;
  error: string | null;
  notice: string | null;
  busy: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  /** Exchange the PKCE code from the reset-email link for a recovery session. */
  beginPasswordRecovery: (code: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  /** Current JWT access token (auto-refreshed by supabase-js), or null. */
  getAccessToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

/** supabase-js returns errors instead of throwing; turn them into throws for runAuth. */
function check<T extends { error: Error | null }>(result: T): T {
  if (result.error) throw result.error;
  return result;
}

let initialized = false;

export const useSupabaseAuthStore = create<SupabaseAuthState>((set) => {
  /**
   * Shared guard + busy/error handling for every auth action, so `busy` can never
   * stick on a thrown network error. `fn` may return a notice to show, or `false`
   * for a quiet cancel (e.g. user closed the Google sheet).
   */
  const runAuth = async (
    fallback: string,
    fn: (client: Client) => Promise<string | false | void>,
  ): Promise<boolean> => {
    const client = getSupabase();
    if (!client) {
      set({ error: NOT_CONFIGURED });
      return false;
    }
    set({ busy: true, error: null, notice: null });
    try {
      const result = await fn(client);
      set({ busy: false, notice: typeof result === 'string' ? result : null });
      return result !== false;
    } catch (e) {
      set({ busy: false, error: errorMessage(e, fallback) });
      return false;
    }
  };

  return {
    status: 'uninitialized',
    user: null,
    session: null,
    error: null,
    notice: null,
    busy: false,

    init: async () => {
      if (initialized) return;
      initialized = true;

      const client = getSupabase();
      if (!client) {
        set({ status: 'signedOut', user: null, session: null });
        return;
      }

      try {
        const { data } = await client.auth.getSession();
        set({
          status: data.session ? 'signedIn' : 'signedOut',
          user: data.session?.user ?? null,
          session: data.session ?? null,
        });
      } catch (e) {
        console.error('Session restore failed:', e);
        set({ status: 'signedOut', user: null, session: null });
      }

      client.auth.onAuthStateChange((_event, session) => {
        set({
          status: session ? 'signedIn' : 'signedOut',
          user: session?.user ?? null,
          session: session ?? null,
        });
      });
    },

    signIn: (email, password) =>
      runAuth('Sign in failed.', async (c) => {
        check(await c.auth.signInWithPassword({ email, password }));
      }),

    signUp: (email, password) =>
      runAuth('Sign up failed.', async (c) => {
        const { data } = check(await c.auth.signUp({ email, password }));
        // With email confirmation on, no session is returned until the link is opened.
        if (!data.session) return 'Check your email to confirm your account, then sign in.';
      }),

    signInWithGoogle: () =>
      runAuth('Google sign-in failed.', async (c) => {
        const redirectTo = Linking.createURL('auth-callback');
        const { data } = check(
          await c.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo, skipBrowserRedirect: true },
          }),
        );
        if (!data.url) throw new Error('Could not start Google sign-in.');

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== 'success') return false;
        const code = Linking.parse(result.url).queryParams?.code;
        if (typeof code !== 'string') throw new Error('Google sign-in returned no code.');
        check(await c.auth.exchangeCodeForSession(code));
      }),

    resetPassword: async (email) => {
      if (!email) {
        set({ error: 'Enter your email first.' });
        return false;
      }
      return runAuth('Could not send the reset email.', async (c) => {
        // Link must be opened on this device: the PKCE verifier lives in local storage.
        check(await c.auth.resetPasswordForEmail(email, { redirectTo: Linking.createURL('reset-password') }));
        return 'Password reset email sent. Open the link on this phone.';
      });
    },

    beginPasswordRecovery: (code) =>
      runAuth('This reset link is invalid or expired.', async (c) => {
        check(await c.auth.exchangeCodeForSession(code));
      }),

    updatePassword: (password) =>
      runAuth('Could not update the password.', async (c) => {
        check(await c.auth.updateUser({ password }));
        return 'Password updated.';
      }),

    getAccessToken: async () => {
      const client = getSupabase();
      if (!client) return null;
      const { data } = await client.auth.getSession();
      return data.session?.access_token ?? null;
    },

    signOut: async () => {
      const client = getSupabase();
      if (client) {
        try {
          const { error } = await client.auth.signOut();
          // Offline: the server call fails and supabase-js keeps the session, so the
          // user would be signed back in on relaunch. Drop it locally instead.
          if (error) await client.auth.signOut({ scope: 'local' });
        } catch (e) {
          console.error('Sign out failed:', e);
          await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
        }
      }
      set({ status: 'signedOut', user: null, session: null, error: null, notice: null });
    },

    clearError: () => set({ error: null, notice: null }),
  };
});
