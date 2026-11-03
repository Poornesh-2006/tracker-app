import { getDb } from './database';

/**
 * Shared data-access helpers. Every service goes through these instead of
 * repeating `const db = await getDb()` + row mapping boilerplate.
 * Resolves to the native or web database automatically via `./database`.
 */
export type SqlValue = string | number | null;

export async function all<T>(sql: string, ...params: SqlValue[]): Promise<T[]> {
  const db = await getDb();
  return db.getAllAsync<T>(sql, ...params);
}

export async function first<T>(sql: string, ...params: SqlValue[]): Promise<T | null> {
  const db = await getDb();
  return (await db.getFirstAsync<T>(sql, ...params)) ?? null;
}

/** Run a write; returns rows changed. */
export async function run(sql: string, ...params: SqlValue[]): Promise<number> {
  const db = await getDb();
  return (await db.runAsync(sql, ...params)).changes;
}

/** Run an INSERT; returns the new row id. */
export async function insert(sql: string, ...params: SqlValue[]): Promise<number> {
  const db = await getDb();
  return (await db.runAsync(sql, ...params)).lastInsertRowId;
}

/** Tables that may be deleted from by id (table names can't be bound as SQL parameters). */
export type Table =
  | 'blood_tests' | 'food_log' | 'workouts' | 'hydration_log' | 'todos' | 'wardrobe_items' | 'grooming_routines'
  | 'knowledge_nodes' | 'learning_media' | 'skills' | 'education_marks' | 'college_activities'
  | 'finance_transactions' | 'finance_subscriptions' | 'investments' | 'travel_trips';

export async function deleteById(table: Table, id: number | string): Promise<void> {
  await run(`DELETE FROM ${table} WHERE id = ?`, id);
}

let txQueue: Promise<unknown> = Promise.resolve();

/**
 * All-or-nothing: any throw inside rolls every write back.
 * Serialized: SQLite can't nest BEGIN on one connection, so concurrent callers
 * (e.g. a double-tapped button) wait their turn instead of crashing.
 * Don't call `transaction` from inside another one — it would deadlock.
 */
export function transaction(task: () => Promise<void>): Promise<void> {
  const next = txQueue.then(async () => {
    const db = await getDb();
    await db.withTransactionAsync(task);
  });
  txQueue = next.catch(() => undefined);
  return next;
}

export const bool = (value: boolean | null | undefined): number => (value ? 1 : 0);

const camel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/**
 * snake_case row -> camelCase object. SQLite has no boolean type, so the
 * listed (camelCase) keys are converted from 0/1 to true/false.
 */
export function fromRow<T>(row: object, booleans: readonly string[] = []): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) out[camel(key)] = value;
  for (const key of booleans) out[key] = !!out[key];
  return out as T;
}

export async function allAs<T>(
  sql: string,
  params: SqlValue[] = [],
  booleans: readonly string[] = [],
): Promise<T[]> {
  const rows = await all<object>(sql, ...params);
  return rows.map((r) => fromRow<T>(r, booleans));
}
