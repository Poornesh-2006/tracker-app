import { allAs, deleteById, first, insert, run } from './db';
import { dateOf, enqueueDays } from './sync-queue';
import { awardPointsSafely } from './gamification-service';
import type { FoodLogEntry, FoodLogInput } from '@/types';

const params = (i: FoodLogInput) =>
  [
    i.date,
    i.mealType,
    i.name,
    i.calories ?? null,
    i.protein ?? null,
    i.carbs ?? null,
    i.fat ?? null,
    i.photoUri ?? null,
  ] as const;

export async function addFoodLog(input: FoodLogInput): Promise<number> {
  const id = await insert(
    `INSERT INTO food_log (date, meal_type, name, calories, protein, carbs, fat, photo_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ...params(input),
  );
  await enqueueDays('meals', input.date);
  await awardPointsSafely('meal', input.date);
  return id;
}

export function listFoodByDate(date: string): Promise<FoodLogEntry[]> {
  return allAs<FoodLogEntry>(`SELECT * FROM food_log WHERE date = ? ORDER BY id ASC`, [date]);
}

export function listFoodBetween(fromDate: string, toDate: string): Promise<FoodLogEntry[]> {
  return allAs<FoodLogEntry>(
    `SELECT * FROM food_log WHERE date >= ? AND date <= ? ORDER BY date ASC, id ASC`,
    [fromDate, toDate],
  );
}

export async function updateFoodLog(id: number, input: FoodLogInput): Promise<void> {
  const oldDate = await dateOf('food_log', id);
  await run(
    `UPDATE food_log
     SET date = ?, meal_type = ?, name = ?, calories = ?, protein = ?, carbs = ?, fat = ?, photo_uri = ?
     WHERE id = ?`,
    ...params(input),
    id,
  );
  await enqueueDays('meals', oldDate, input.date); // re-dated: both days change
}

export async function deleteFoodLog(id: number): Promise<void> {
  const date = await dateOf('food_log', id);
  await deleteById('food_log', id);
  await enqueueDays('meals', date);
}

export async function caloriesForDate(date: string): Promise<number> {
  const row = await first<{ total: number | null }>(
    `SELECT COALESCE(SUM(calories), 0) AS total FROM food_log WHERE date = ?`,
    date,
  );
  return row?.total ?? 0;
}
