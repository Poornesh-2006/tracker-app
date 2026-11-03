import { getRandomValues } from 'expo-crypto';

/**
 * Hermes has no `crypto.getRandomValues`. Encryption (IVs, salts) and
 * supabase-js (PKCE verifier) need it, so provide the native CSPRNG.
 * Import this first in the root layout.
 */
const g = globalThis as { crypto?: Partial<Crypto> };
g.crypto ??= {};
if (typeof g.crypto.getRandomValues !== 'function') {
  g.crypto.getRandomValues = getRandomValues as Crypto['getRandomValues'];
}
