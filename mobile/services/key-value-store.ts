import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Async key/value store for secrets (passcode key, Supabase session).
 *
 * expo-secure-store is native-only: its web build is literally
 * `export default {}`, so every call from a browser throws
 * `getValueWithKeyAsync is not a function` and used to crash app boot.
 * Browsers therefore fall back to localStorage, and any native keychain
 * failure degrades the same way instead of throwing.
 *
 * Browser storage is not hardware-backed — it is a preview convenience,
 * not production security.
 */
const useSecureStore = Platform.OS !== 'web';

function localGet(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function localSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode) — the session just won't persist.
  }
}

function localRemove(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

/**
 * Shape-compatible with Supabase's `auth.storage`, which is why the methods are
 * named getItem/setItem/removeItem rather than get/set/remove.
 */
export const keyValueStore = {
  async getItem(key: string): Promise<string | null> {
    if (useSecureStore) {
      try {
        return await SecureStore.getItemAsync(key);
      } catch {
        return localGet(key);
      }
    }
    return localGet(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (useSecureStore) {
      // No fallback on native: React Native has no localStorage, so swallowing the
      // error would make setup "succeed" without saving the passcode verifier.
      await SecureStore.setItemAsync(key, value);
      return;
    }
    localSet(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (useSecureStore) {
      try {
        await SecureStore.deleteItemAsync(key);
        return;
      } catch {
        localRemove(key);
        return;
      }
    }
    localRemove(key);
  },
};
