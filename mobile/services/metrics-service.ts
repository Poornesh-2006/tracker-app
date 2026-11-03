import { allAs, first, insert, run, transaction } from './db';
import { enqueueDays } from './sync-queue';
import { awardPointsSafely } from './gamification-service';
import type { DailyMetrics, DailyMetricsInput } from '@/types';

const COLS = 'id, date, heart_rate, steps, sleep_hours, stress, weight, recovery_score, notes';

const FIELDS = ['heartRate', 'steps', 'sleepHours', 'stress', 'weight', 'recoveryScore', 'notes'] as const;

/**
 * One row per date. By default fields left null keep their stored value;
 * with `{ replace: true }` (the check-in form, which prefills everything) the
 * given values are written as-is, so users can clear a field.
 * Runs in the serialized transaction queue so a double-tap can't race
 * SELECT-then-INSERT into the UNIQUE(date) constraint.
 */
export async function upsertDailyMetrics(input: DailyMetricsInput, opts: { replace?: boolean } = {}): Promise<number> {
  if (!opts.replace && FIELDS.every((k) => input[k] == null)) throw new Error('Nothing to save — fill at least one field.');
  const values = [
    input.heartRate ?? null,
    input.steps ?? null,
    input.sleepHours ?? null,
    input.stress ?? null,
    input.weight ?? null,
    input.recoveryScore ?? null,
    input.notes ?? null,
  ];
  const set = (col: string) => (opts.replace ? '?' : `COALESCE(?, ${col})`);
  let id = 0;
  await transaction(async () => {
    const existing = await first<{ id: number }>(`SELECT id FROM daily_metrics WHERE date = ?`, input.date);
    if (existing) {
      await run(
        `UPDATE daily_metrics SET
           heart_rate = ${set('heart_rate')},
           steps = ${set('steps')},
           sleep_hours = ${set('sleep_hours')},
           stress = ${set('stress')},
           weight = ${set('weight')},
           recovery_score = ${set('recovery_score')},
           notes = ${set('notes')}
         WHERE id = ?`,
        ...values,
        existing.id,
      );
      id = existing.id;
      await enqueueDays('daily_metrics', input.date); // edits must sync too
      return;
    }
    id = await insert(
      `INSERT INTO daily_metrics (date, heart_rate, steps, sleep_hours, stress, weight, recovery_score, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      input.date,
      ...values,
    );
    await enqueueDays('daily_metrics', input.date);
  });
  if (FIELDS.some((k) => input[k] != null)) await awardPointsSafely('metrics', input.date); // outside: transaction() can't nest
  return id;
}

export async function getDailyMetrics(date: string): Promise<DailyMetrics | null> {
  const [row] = await allAs<DailyMetrics>(`SELECT ${COLS} FROM daily_metrics WHERE date = ?`, [date]);
  return row ?? null;
}

export function listDailyMetricsBetween(fromDate: string, toDate: string): Promise<DailyMetrics[]> {
  return allAs<DailyMetrics>(
    `SELECT ${COLS} FROM daily_metrics WHERE date >= ? AND date <= ? ORDER BY date ASC`,
    [fromDate, toDate],
  );
}

/** Latest `days` rows, oldest first. */
export async function listRecentMetrics(days: number): Promise<DailyMetrics[]> {
  const rows = await allAs<DailyMetrics>(`SELECT ${COLS} FROM daily_metrics ORDER BY date DESC LIMIT ?`, [days]);
  return rows.reverse();
}
