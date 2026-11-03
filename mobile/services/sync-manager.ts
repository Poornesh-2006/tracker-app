import { all, first, run } from './db';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { getDailyMetrics } from './metrics-service';
import { listFoodByDate } from './meal-service';
import { listWorkoutsForDate } from './workout-service';
import { getSyncOwner, setSyncOwner } from './settings-service';
import type { DailyMetricsRow, MealsRow, WorkoutsRow } from '@/types/supabase';
import type { DailyMetrics, FoodLogEntry, WorkoutEntry } from '@/types';
import { errorMessage } from '@/utils/helpers';
import { enqueueDay, type SyncKind } from './sync-queue';
import { todayStr } from '@/utils/dates';

/**
 * Sync model: the queue holds "this day changed" markers, not row snapshots.
 * Write services (meal/workout/metrics) enqueue the affected day(s) on every
 * add/update/delete via ./sync-queue; syncLatest/syncAll add today/all history.
 * Pushing a marker reads the day's *current* local data and replaces that day
 * remotely (upsert for metrics; delete + insert for meals/workouts). So:
 *  - re-syncing never creates duplicates,
 *  - local edits/deletes propagate,
 *  - a failed push is retried later with fresh data.
 */
export type { SyncKind };
export { enqueueDay };
const KINDS: SyncKind[] = ['daily_metrics', 'meals', 'workouts'];

interface QueueRow {
  id: number;
  kind: string;
  payload: string;
}

/** Shape sent to Supabase (server fills user_id/timestamps). */
type Outgoing<T> = Omit<T, 'user_id' | 'created_at' | 'last_updated'>;

export interface SyncResult {
  pushed: number;
  remaining: number;
  error: string | null;
}

export function toMetricsRow(m: DailyMetrics): Outgoing<DailyMetricsRow> {
  return {
    metric_date: m.date,
    resting_heart_rate_bpm: m.heartRate,
    daily_steps: m.steps,
    sleep_duration_hours: m.sleepHours,
    stress_level: m.stress,
    weight_kg: m.weight,
    overall_day_rating: m.recoveryScore,
    notes: m.notes,
  };
}

export function toMealRow(f: FoodLogEntry): Outgoing<MealsRow> {
  return {
    meal_date: f.date,
    meal_type: f.mealType,
    food_items: [{ name: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat }],
    total_calories: f.calories,
    total_protein_g: f.protein,
    total_carbs_g: f.carbs,
    total_fat_g: f.fat,
    notes: null,
    photo_path: f.photoUri,
  };
}

export function toWorkoutRow(w: WorkoutEntry): Outgoing<WorkoutsRow> {
  return {
    workout_date: w.date,
    workout_name: w.name,
    total_duration_minutes: w.durationMin,
    perceived_intensity: w.intensity,
    estimated_calories_burned: w.calories,
    notes: w.notes,
  };
}

export async function enqueueAllHistory(): Promise<void> {
  const tables = [
    ['daily_metrics', 'daily_metrics'],
    ['meals', 'food_log'],
    ['workouts', 'workouts'],
  ] as const;
  for (const [kind, table] of tables) {
    const rows = await all<{ date: string }>(`SELECT DISTINCT date FROM ${table} ORDER BY date ASC`);
    for (const { date } of rows) await enqueueDay(kind, date);
  }
}

export async function queueLength(): Promise<number> {
  const row = await first<{ count: number }>(`SELECT COUNT(*) AS count FROM sync_queue`);
  return row?.count ?? 0;
}

/** Throws on a remote error so the marker stays queued. */
async function pushDay(kind: string, date: string, userId: string): Promise<void> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase is not configured.');
  const check = ({ error }: { error: { message: string } | null }) => {
    if (error) throw new Error(error.message);
  };

  switch (kind) {
    case 'daily_metrics': {
      const m = await getDailyMetrics(date);
      if (!m) return;
      check(
        await client
          .from('daily_metrics')
          .upsert({ ...toMetricsRow(m), user_id: userId }, { onConflict: 'user_id,metric_date' }),
      );
      return;
    }
    case 'meals': {
      const rows = (await listFoodByDate(date)).map((f) => ({ ...toMealRow(f), user_id: userId }));
      check(await client.from('meals').delete().eq('user_id', userId).eq('meal_date', date));
      if (rows.length) check(await client.from('meals').insert(rows));
      return;
    }
    case 'workouts': {
      const rows = (await listWorkoutsForDate(date)).map((w) => ({ ...toWorkoutRow(w), user_id: userId }));
      check(await client.from('workouts').delete().eq('user_id', userId).eq('workout_date', date));
      if (rows.length) check(await client.from('workouts').insert(rows));
      return;
    }
    default:
      // Unknown/legacy marker (e.g. pre-day-sync 'meal' rows): drop it rather than block the queue.
      return;
  }
}

export async function flushQueue(maxItems = 100): Promise<SyncResult> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) {
    return { pushed: 0, remaining: await queueLength(), error: 'Supabase is not configured.' };
  }
  const { data, error: userError } = await client.auth.getUser();
  const userId = data.user?.id;
  if (userError || !userId) {
    return { pushed: 0, remaining: await queueLength(), error: 'Sign in to sync your data.' };
  }
  const owner = await getSyncOwner();
  if (owner && owner !== userId) {
    return {
      pushed: 0,
      remaining: await queueLength(),
      error: 'Data on this phone belongs to another account. Sign in with that account, or reset the app to use this one.',
    };
  }
  if (!owner) await setSyncOwner(userId); // first sync binds local data to this account

  const queue = await all<QueueRow>(`SELECT id, kind, payload FROM sync_queue ORDER BY id ASC LIMIT ?`, maxItems);
  let pushed = 0;
  let error: string | null = null;
  for (const item of queue) {
    try {
      const { date } = JSON.parse(item.payload) as { date?: string };
      if (date) await pushDay(item.kind, date, userId);
      await run(`DELETE FROM sync_queue WHERE id = ?`, item.id);
      pushed++;
    } catch (e) {
      error = errorMessage(e, 'Sync failed.');
      break; // keep order; retry from here next time
    }
  }
  return { pushed, remaining: await queueLength(), error };
}

export async function syncLatest(): Promise<SyncResult> {
  const date = todayStr();
  for (const kind of KINDS) await enqueueDay(kind, date);
  return flushQueue();
}

export async function syncAll(): Promise<SyncResult> {
  await enqueueAllHistory();
  return flushQueue();
}
