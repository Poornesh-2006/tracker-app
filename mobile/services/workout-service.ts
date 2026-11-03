import { allAs, deleteById, insert, run } from './db';
import { calculateWorkoutCalories } from '@/constants/workout-calculations';
import { dateOf, enqueueDays } from './sync-queue';
import { awardPointsSafely } from './gamification-service';
import type { WorkoutEntry, WorkoutInput } from '@/types';

/** Explicit calories win; otherwise estimate from type, duration and intensity. */
function params(i: WorkoutInput) {
  const calories =
    i.calories ?? (i.durationMin ? calculateWorkoutCalories(i.name, i.durationMin, i.intensity ?? null) : null);
  return [i.date, i.name, i.durationMin ?? null, i.intensity ?? null, calories, i.notes ?? null] as const;
}

export async function addWorkout(input: WorkoutInput): Promise<number> {
  const id = await insert(
    `INSERT INTO workouts (date, name, duration_min, intensity, calories, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    ...params(input),
  );
  await enqueueDays('workouts', input.date);
  await awardPointsSafely('workout', input.date);
  return id;
}

export function listWorkouts(limit = 100): Promise<WorkoutEntry[]> {
  return allAs<WorkoutEntry>(`SELECT * FROM workouts ORDER BY date DESC, id DESC LIMIT ?`, [limit]);
}

export function listWorkoutsForDate(date: string): Promise<WorkoutEntry[]> {
  return allAs<WorkoutEntry>(`SELECT * FROM workouts WHERE date = ? ORDER BY id DESC`, [date]);
}

export function listWorkoutsBetween(fromDate: string, toDate: string): Promise<WorkoutEntry[]> {
  return allAs<WorkoutEntry>(`SELECT * FROM workouts WHERE date >= ? AND date <= ? ORDER BY date ASC, id ASC`, [fromDate, toDate]);
}

export async function updateWorkout(id: number, input: WorkoutInput): Promise<void> {
  const oldDate = await dateOf('workouts', id);
  await run(
    `UPDATE workouts SET date = ?, name = ?, duration_min = ?, intensity = ?, calories = ?, notes = ? WHERE id = ?`,
    ...params(input),
    id,
  );
  await enqueueDays('workouts', oldDate, input.date); // re-dated: both days change
}

export async function deleteWorkout(id: number): Promise<void> {
  const date = await dateOf('workouts', id);
  await deleteById('workouts', id);
  await enqueueDays('workouts', date);
}
