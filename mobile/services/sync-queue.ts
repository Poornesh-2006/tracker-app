import { first, run } from './db';

/**
 * Leaf module (depends only on db) so write services can mark days dirty
 * without importing sync-manager / supabase.
 */
export type SyncKind = 'daily_metrics' | 'meals' | 'workouts';

/** Marks a day dirty. Re-marking the same day is a no-op (no duplicate markers). */
export async function enqueueDay(kind: SyncKind, date: string): Promise<void> {
  const payload = JSON.stringify({ date });
  await run(`DELETE FROM sync_queue WHERE kind = ? AND payload = ?`, kind, payload);
  await run(`INSERT INTO sync_queue (payload, kind) VALUES (?, ?)`, payload, kind);
}

/** Date of a row before it is updated/deleted, so the old day is re-synced too. */
export async function dateOf(table: 'food_log' | 'workouts', id: number): Promise<string | null> {
  return (await first<{ date: string }>(`SELECT date FROM ${table} WHERE id = ?`, id))?.date ?? null;
}

/** Enqueue every distinct non-null date (e.g. old and new date of an edit). */
export async function enqueueDays(kind: SyncKind, ...dates: (string | null)[]): Promise<void> {
  for (const d of new Set(dates.filter((x): x is string => !!x))) await enqueueDay(kind, d);
}

export async function clearSyncQueue(): Promise<void> {
  await run(`DELETE FROM sync_queue`);
}
