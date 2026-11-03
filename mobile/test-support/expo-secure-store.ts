/**
 * In-memory SecureStore for Jest. Rejects values over 2048 bytes like the
 * real keychain may, so oversize writes are caught in tests.
 */
export const store = new Map<string, string>();

const KEY_RE = /^[\w.-]+$/;
const LIMIT = 2048;

function checkKey(key: string) {
  if (!KEY_RE.test(key)) throw new Error(`Invalid SecureStore key: ${key}`);
}

export async function getItemAsync(key: string): Promise<string | null> {
  checkKey(key);
  return store.get(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  checkKey(key);
  if (new TextEncoder().encode(value).length > LIMIT) throw new Error(`SecureStore value over ${LIMIT} bytes`);
  store.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  checkKey(key);
  store.delete(key);
}
