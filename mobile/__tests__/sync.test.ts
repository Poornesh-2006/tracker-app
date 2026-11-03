import { resetDatabase } from '@/services/database';
import { all, run } from '@/services/db';
import { addFoodLog, deleteFoodLog, updateFoodLog } from '@/services/meal-service';
import { addWorkout, deleteWorkout } from '@/services/workout-service';
import { upsertDailyMetrics } from '@/services/metrics-service';
import { flushQueue, queueLength, syncAll, syncLatest } from '@/services/sync-manager';
import { todayStr } from '@/utils/dates';
import { mockRemote } from '../test-support/mock-supabase';

jest.mock('@/services/supabase', () => require('../test-support/mock-supabase').supabaseModule);

const today = todayStr();
const remote = (t: string) => mockRemote.rows(t);

beforeEach(async () => {
  await resetDatabase();
  mockRemote.reset();
});

describe('sync', () => {
  it('pushes today and never duplicates on repeat syncs (regression: meals/workouts re-inserted every sync)', async () => {
    await addFoodLog({ date: today, mealType: 'lunch', name: 'Rice', calories: 300 });
    await addWorkout({ date: today, name: 'Running', durationMin: 20 });
    await upsertDailyMetrics({ date: today, steps: 5000 });

    for (let i = 0; i < 3; i++) expect((await syncLatest()).error).toBeNull();

    expect(remote('meals')).toHaveLength(1);
    expect(remote('workouts')).toHaveLength(1);
    expect(remote('daily_metrics')).toHaveLength(1);
    expect(remote('meals')[0]).toMatchObject({ user_id: 'user-1', meal_date: today, total_calories: 300 });
    expect(await queueLength()).toBe(0);
  });

  it('propagates local edits and deletes', async () => {
    const rice = await addFoodLog({ date: today, mealType: 'lunch', name: 'Rice', calories: 300 });
    await syncLatest();
    await deleteFoodLog(rice);
    await addFoodLog({ date: today, mealType: 'dinner', name: 'Dal', calories: 200 });
    await syncLatest();
    expect(remote('meals').map((m) => m.total_calories)).toEqual([200]);
  });

  it('syncAll covers every day of history once', async () => {
    await addFoodLog({ date: '2025-01-01', mealType: 'lunch', name: 'A', calories: 1 });
    await addFoodLog({ date: '2025-01-01', mealType: 'dinner', name: 'B', calories: 2 });
    await addFoodLog({ date: '2025-02-01', mealType: 'lunch', name: 'C', calories: 3 });
    await upsertDailyMetrics({ date: '2025-01-01', steps: 10 });
    await syncAll();
    await syncAll();
    expect(remote('meals')).toHaveLength(3);
    expect(remote('daily_metrics')).toHaveLength(1);
  });

  it('keeps the marker queued when a push fails, then retries with fresh data', async () => {
    await addFoodLog({ date: today, mealType: 'lunch', name: 'Rice', calories: 300 });
    mockRemote.failNextInsert = true;
    const failed = await syncLatest();
    expect(failed.error).toBe('network down');
    expect(failed.remaining).toBeGreaterThan(0);
    const retried = await flushQueue();
    expect(retried).toMatchObject({ error: null, remaining: 0 });
    expect(remote('meals')).toHaveLength(1);
  });

  it('re-marking a day does not grow the queue', async () => {
    mockRemote.user = null; // not signed in: nothing is flushed
    await syncLatest();
    await syncLatest();
    expect(await queueLength()).toBe(3); // one marker per kind
    expect((await flushQueue()).error).toMatch(/Sign in/);
  });

  it('drops unknown/legacy queue rows instead of blocking the queue forever (regression)', async () => {
    await run(`INSERT INTO sync_queue (payload, kind) VALUES (?, 'meal')`, JSON.stringify({ meal_date: today }));
    await addFoodLog({ date: today, mealType: 'lunch', name: 'Rice', calories: 300 });
    const r = await syncLatest();
    expect(r).toMatchObject({ error: null, remaining: 0 });
    expect(remote('meals')).toHaveLength(1);
    expect(await all('SELECT * FROM sync_queue')).toEqual([]);
  });

  it('past-day edits reach the server without a full sync (regression: only today was ever queued)', async () => {
    const id = await addFoodLog({ date: '2025-03-01', mealType: 'lunch', name: 'Old', calories: 100 });
    await flushQueue();
    expect(remote('meals')).toHaveLength(1);

    // Re-date: both the old and the new day must be re-pushed.
    await updateFoodLog(id, { date: '2025-03-02', mealType: 'lunch', name: 'Old', calories: 150 });
    await flushQueue();
    expect(remote('meals').map((m) => [m.meal_date, m.total_calories])).toEqual([['2025-03-02', 150]]);

    const w = await addWorkout({ date: '2025-03-05', name: 'Run', durationMin: 10 });
    await flushQueue();
    await deleteWorkout(w);
    await flushQueue();
    expect(remote('workouts')).toEqual([]);
    expect(await queueLength()).toBe(0);
  });

  it("never pushes one account's local data into another account", async () => {
    await addFoodLog({ date: today, mealType: 'lunch', name: 'Rice', calories: 300 });
    expect((await flushQueue()).error).toBeNull(); // binds this phone's data to user-1

    mockRemote.user = { id: 'user-2' };
    await addFoodLog({ date: today, mealType: 'dinner', name: 'Dal', calories: 200 });
    const r = await flushQueue();
    expect(r.error).toMatch(/another account/);
    expect(r.remaining).toBeGreaterThan(0);
    expect(remote('meals').every((m) => m.user_id === 'user-1')).toBe(true);
  });
});
