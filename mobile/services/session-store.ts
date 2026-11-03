import { Platform } from 'react-native';
import { keyValueStore } from '@/services/key-value-store';

/**
 * Supabase auth storage that survives SecureStore's ~2048-byte value limit.
 *
 * A session (JWT + refresh token + user/identity metadata) is often 3-5 KB,
 * which SecureStore may reject. Large values are split across numbered keys:
 *   <key>        -> "kvchunks:v1:<count>"
 *   <key>.<i>    -> chunk i
 * Everything stays in the keychain/keystore. Web has no limit, so it's a passthrough.
 */
const MARKER = 'kvchunks:v1:';
// 600 UTF-16 units <= 1800 UTF-8 bytes even for 3-byte chars, safely under 2048.
const CHUNK = 600;
const chunked = Platform.OS !== 'web';

function chunkCount(head: string | null): number {
  if (!head?.startsWith(MARKER)) return 0;
  const n = Number(head.slice(MARKER.length));
  return Number.isInteger(n) && n > 0 ? n : 0;
}

async function removeChunks(key: string, from: number, to: number): Promise<void> {
  await Promise.all(
    Array.from({ length: Math.max(0, to - from) }, (_, i) =>
      keyValueStore.removeItem(`${key}.${from + i}`),
    ),
  );
}

export const sessionStore = {
  async getItem(key: string): Promise<string | null> {
    const head = await keyValueStore.getItem(key);
    if (!chunked) return head;
    const n = chunkCount(head);
    if (!n) return head;
    const parts = await Promise.all(
      Array.from({ length: n }, (_, i) => keyValueStore.getItem(`${key}.${i}`)),
    );
    // A missing chunk means a torn write; treat as no session rather than corrupt JSON.
    return parts.every((p) => p !== null) ? parts.join('') : null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!chunked) return keyValueStore.setItem(key, value);
    const oldCount = chunkCount(await keyValueStore.getItem(key));
    if (value.length <= CHUNK) {
      await keyValueStore.setItem(key, value);
      await removeChunks(key, 0, oldCount);
      return;
    }
    const parts: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK) parts.push(value.slice(i, i + CHUNK));
    await Promise.all(parts.map((p, i) => keyValueStore.setItem(`${key}.${i}`, p)));
    await keyValueStore.setItem(key, `${MARKER}${parts.length}`);
    await removeChunks(key, parts.length, oldCount);
  },

  async removeItem(key: string): Promise<void> {
    if (chunked) {
      const n = chunkCount(await keyValueStore.getItem(key));
      await removeChunks(key, 0, n);
    }
    await keyValueStore.removeItem(key);
  },
};
