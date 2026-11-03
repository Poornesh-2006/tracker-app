import { all, run } from './db';
import type { AppSettings } from '@/types';

const THEMES: readonly string[] = ['light', 'dark', 'system'];

const UPSERT = `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;

export async function setSetting(key: keyof AppSettings, value: string): Promise<void> {
  await run(UPSERT, key, value);
}

/** Unknown or corrupt values fall back to defaults. */
export async function getSettings(): Promise<AppSettings> {
  const rows = await all<{ key: string; value: string }>(`SELECT key, value FROM settings`);
  const map: Record<string, string> = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    theme: THEMES.includes(map.theme) ? (map.theme as AppSettings['theme']) : 'system',
    units: map.units === 'imperial' ? 'imperial' : 'metric',
    syncEnabled: map.syncEnabled === 'true',
  };
}

/**
 * Supabase user the local data belongs to. The local DB isn't per-user, so
 * sync refuses to push one account's data into another's.
 */
const SYNC_OWNER = 'syncOwner';

export async function getSyncOwner(): Promise<string | null> {
  const [row] = await all<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, SYNC_OWNER);
  return row?.value ?? null;
}

export async function setSyncOwner(userId: string): Promise<void> {
  await run(UPSERT, SYNC_OWNER, userId);
}
