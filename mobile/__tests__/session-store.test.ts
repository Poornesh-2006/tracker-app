const mockMem = new Map<string, string>();

jest.mock('@/services/key-value-store', () => ({
  keyValueStore: {
    getItem: async (k: string) => mockMem.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      if (v.length > 2048) throw new Error('too big');
      mockMem.set(k, v);
    },
    removeItem: async (k: string) => {
      mockMem.delete(k);
    },
  },
}));

import { sessionStore } from '@/services/session-store';

const KEY = 'sb-supabase-auth';

beforeEach(() => mockMem.clear());

test('small value stored directly', async () => {
  await sessionStore.setItem(KEY, 'hello');
  expect(mockMem.get(KEY)).toBe('hello');
  expect(await sessionStore.getItem(KEY)).toBe('hello');
});

test('large value round-trips via chunks under limit', async () => {
  const big = JSON.stringify({ token: 'x'.repeat(4500), name: 'Zoë 🚀' });
  await sessionStore.setItem(KEY, big);
  expect(mockMem.get(KEY)).toMatch(/^kvchunks:v1:\d+$/);
  expect(await sessionStore.getItem(KEY)).toBe(big);
});

test('shrinking and removing clears stale chunks', async () => {
  await sessionStore.setItem(KEY, 'a'.repeat(3000));
  await sessionStore.setItem(KEY, 'b'.repeat(700));
  expect(await sessionStore.getItem(KEY)).toBe('b'.repeat(700));
  expect([...mockMem.keys()].sort()).toEqual([KEY, `${KEY}.0`, `${KEY}.1`]);
  await sessionStore.setItem(KEY, 'small');
  expect([...mockMem.keys()]).toEqual([KEY]);
  await sessionStore.setItem(KEY, 'c'.repeat(3000));
  await sessionStore.removeItem(KEY);
  expect(mockMem.size).toBe(0);
});

test('missing chunk returns null', async () => {
  await sessionStore.setItem(KEY, 'a'.repeat(3000));
  mockMem.delete(`${KEY}.2`);
  expect(await sessionStore.getItem(KEY)).toBeNull();
});
