import { allAs, first, insert, run, transaction } from './db';
import { enqueueDays } from './sync-queue';
import { awardPointsSafely } from './gamification-service';
import type { DailyMetrics, DailyMetricsInput } from '@/types';

const COLS = 'id, date, heart_rate, steps, sleep_hours, stress, weight, recovery_score, notes';

/**
 * One row per date. Fields left null keep their stored value.
 * Runs in the serialized transaction queue so a double-tap can't race
 * SELECT-then-INSERT into the UNIQUE(date) constraint.
 */
export async function upsertDailyMetrics(input: DailyMetricsInput): Promise<number> {
  const values = [
    input.heartRate ?? null,
    input.steps ?? null,
    input.sleepHours ?? null,
    input.stress ?? null,
    input.weight ?? null,
    input.recoveryScore ?? null,
    input.notes ?? null,
  ];
  let id = 0;
  await transaction(async () => {
    const existing = await first<{ id: number }>(`SELECT id FROM daily_metrics WHERE date = ?`, input.date);
    if (existing) {
      await run(
        `UPDATE daily_metrics SET
           heart_rate = COALESCE(?, heart_rate),
           steps = COALESCE(?, steps),
           sleep_hours = COALESCE(?, sleep_hours),
           stress = COALESCE(?, stress),
           weight = COALESCE(?, weight),
           recovery_score = COALESCE(?, recovery_score),
           notes = COALESCE(?, notes)
         WHERE id = ?`,
        ...values,
        existing.id,
      );
      id = existing.id;
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
  await awardPointsSafely('metrics', input.date); // outside: transaction() can't nest
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
