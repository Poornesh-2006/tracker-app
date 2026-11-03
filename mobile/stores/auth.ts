import { AppState } from 'react-native';
import { create } from 'zustand';
import { keyValueStore } from '@/services/key-value-store';
import { encryptionService } from '@/services/encryption';
import { resetDatabase } from '@/services/database';
import { canDecryptWith, hasBloodTests, reencryptAll } from '@/services/blood-test-service';
import { useSettingsStore } from '@/stores/settings';
import { useSupabaseAuthStore } from '@/stores/supabase-auth';
import { errorMessage } from '@/utils/helpers';

export type AuthStatus = 'uninitialized' | 'locked' | 'unlocked';

export const MIN_PASSWORD_LENGTH = 6;

/** Lock after this long in the background. */
export const AUTO_LOCK_MS = 60_000;

/** Wrong-passcode backoff: free attempts, then 30s doubling up to 5 min. Persisted so a restart doesn't reset it. */
const ATTEMPTS_KEY = 'lifos.auth.attempts';
const FREE_ATTEMPTS = 5;
const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 5 * 60_000;

interface Attempts {
  count: number;
  until: number;
}

async function readAttempts(): Promise<Attempts> {
  try {
    const raw = await keyValueStore.getItem(ATTEMPTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Attempts>) : {};
    return { count: Number(parsed.count) || 0, until: Number(parsed.until) || 0 };
  } catch {
    return { count: 0, until: 0 };
  }
}

export function lockoutDelayMs(failures: number): number {
  if (failures < FREE_ATTEMPTS) return 0;
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (failures - FREE_ATTEMPTS));
}

async function recordFailure(): Promise<void> {
  const { count } = await readAttempts();
  const next = count + 1;
  const delay = lockoutDelayMs(next);
  await keyValueStore
    .setItem(ATTEMPTS_KEY, JSON.stringify({ count: next, until: delay ? Date.now() + delay : 0 }))
    .catch(() => undefined);
}

interface AuthState {
  status: AuthStatus;
  bootstrapped: boolean;
  error: string | null;
  init: () => Promise<void>;
  setup: (password: string) => Promise<boolean>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<boolean>;
  resetAll: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'uninitialized',
  bootstrapped: false,
  error: null,

  init: async () => {
    try {
      const initialized = await encryptionService.isInitialized();
      set({
        status: initialized ? 'locked' : 'uninitialized',
        bootstrapped: true,
        error: null,
      });
    } catch (e) {
      // Never leave the app unbootable because key storage failed.
      console.error('Auth init failed:', e);
      set({
        status: 'uninitialized',
        bootstrapped: true,
        error: errorMessage(e, 'Secure storage is unavailable on this device.'),
      });
    }
  },

  setup: async (password) => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      set({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      return false;
    }
    try {
      // Never set up over existing ciphertext: a keychain read failure must not
      // silently orphan every encrypted lab result.
      if (await hasBloodTests()) {
        throw new Error('Encrypted data already exists on this phone. Unlock with your passcode, or reset the app to start over.');
      }
      await encryptionService.setup(password);
      set({ status: 'unlocked', error: null });
      return true;
    } catch (e) {
      set({ error: errorMessage(e, 'Setup failed.') });
      return false;
    }
  },

  unlock: async (password) => {
    try {
      const { until } = await readAttempts();
      const wait = until - Date.now();
      if (wait > 0) {
        set({ error: `Too many attempts. Try again in ${Math.ceil(wait / 1000)}s.` });
        return false;
      }
      const ok = await encryptionService.unlock(password, reencryptAll, canDecryptWith);
      if (ok) {
        await keyValueStore.removeItem(ATTEMPTS_KEY).catch(() => undefined);
        set({ status: 'unlocked', error: null });
      } else {
        await recordFailure();
        set({ error: 'Incorrect password.' });
      }
      return ok;
    } catch (e) {
      set({ error: errorMessage(e, 'Unlock failed.') });
      return false;
    }
  },

  lock: async () => {
    encryptionService.lock();
    set({ status: 'locked', error: null });
  },

  changePassword: async (current, next) => {
    if (next.length < MIN_PASSWORD_LENGTH) {
      set({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      return false;
    }
    try {
      // Same brute-force backoff as unlock: this path also checks the current passcode.
      const wait = (await readAttempts()).until - Date.now();
      if (wait > 0) {
        set({ error: `Too many attempts. Try again in ${Math.ceil(wait / 1000)}s.` });
        return false;
      }
      const ok = await encryptionService.changePassword(current, next, reencryptAll, canDecryptWith);
      if (ok) await keyValueStore.removeItem(ATTEMPTS_KEY).catch(() => undefined);
      else await recordFailure();
      set(ok ? { status: 'unlocked', error: null } : { error: 'Current password is incorrect.' });
      return ok;
    } catch (e) {
      set({ error: errorMessage(e, 'Password change failed.') });
      return false;
    }
  },

  resetAll: async () => {
    await resetDatabase();
    await encryptionService.reset();
    await keyValueStore.removeItem(ATTEMPTS_KEY).catch(() => undefined);
    // Fresh start: no account left signed in, settings back to defaults.
    await useSupabaseAuthStore.getState().signOut().catch(() => undefined);
    await useSettingsStore.getState().load();
    set({ status: 'uninitialized', bootstrapped: true, error: null });
  },

  clearError: () => set({ error: null }),
}));

/**
 * Auto-lock: drop the key and decrypted data after AUTO_LOCK_MS in the
 * background. Short trips (share sheet, photo picker, Google sign-in) don't lock.
 */
// Also on web: React Native Web maps tab visibility to AppState.
{
  let backgroundedAt: number | null = null;
  AppState.addEventListener('change', (state) => {
    if (state === 'background') {
      backgroundedAt ??= Date.now();
      return;
    }
    if (state !== 'active') return;
    const away = backgroundedAt == null ? 0 : Date.now() - backgroundedAt;
    backgroundedAt = null;
    if (away >= AUTO_LOCK_MS && useAuthStore.getState().status === 'unlocked') {
      void useAuthStore.getState().lock();
    }
  });
}
