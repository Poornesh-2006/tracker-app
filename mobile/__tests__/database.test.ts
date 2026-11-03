import { getDb, resetDatabase } from '@/services/database';
import { all, first, fromRow, run, transaction } from '@/services/db';

const TABLES = [
  'points_log',
  'blood_tests', 'daily_metrics', 'food_log', 'workouts', 'settings', 'sync_queue', 'todos', 'hydration_log',
  'wardrobe_items', 'grooming_routines', 'knowledge_nodes', 'learning_media', 'skills', 'education_marks',
  'college_activities', 'finance_transactions', 'finance_subscriptions', 'investments', 'travel_trips',
  'travel_stops', 'travel_live', 'user_ranks', 'achievements', 'rewards_shop', 'user_purchases',
];

const tableNames = async () =>
  (await all<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`))
    .map((r) => r.name)
    .sort();

beforeEach(() => resetDatabase());

describe('database', () => {
  it('runs every migration and records the version', async () => {
    expect(await tableNames()).toEqual([...TABLES].sort());
    expect((await first<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(6);
  });

  it('enables foreign keys on every open, not just the first launch (regression)', async () => {
    // Simulate an app restart: fresh module state, existing DB file.
    let restarted!: typeof import('@/services/database');
    jest.isolateModules(() => {
      restarted = require('@/services/database');
    });
    const conn = await restarted.getDb();
    const row = await conn.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    await conn.closeAsync();
    expect(row?.foreign_keys).toBe(1);
  });

  it('resetDatabase wipes data and recreates every table (regression: tables were left missing)', async () => {
    await run(`INSERT INTO todos (title) VALUES ('x')`);
    await resetDatabase();
    expect(await tableNames()).toEqual([...TABLES].sort());
    expect(await all('SELECT * FROM todos')).toEqual([]);
  });

  it('shares one connection between concurrent first callers', async () => {
    await resetDatabase();
    const [a, b] = await Promise.all([getDb(), getDb()]);
    expect(a).toBe(b);
  });

  it('transaction rolls back every write on error', async () => {
    await expect(
      transaction(async () => {
        await run(`INSERT INTO todos (title) VALUES ('a')`);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await all('SELECT * FROM todos')).toEqual([]);
  });

  it('fromRow camel-cases keys and converts listed booleans', () => {
    expect(fromRow({ share_with_parents: 1, total_distance_km: 2.5, line_2_color: 'x' }, ['shareWithParents'])).toEqual(
      { shareWithParents: true, totalDistanceKm: 2.5, line2Color: 'x' },
    );
  });
});
