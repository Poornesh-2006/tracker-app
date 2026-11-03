import { daysAgo } from '@/utils/dates';

/** Weekly workout summary for the last 7 days (including today). */
export function summarizeWorkoutsWeek(
  workouts: { date: string; durationMin: number | null; calories: number | null }[],
) {
  const from = daysAgo(6);
  const week = workouts.filter((w) => w.date >= from);
  return {
    count: week.length,
    durationMin: week.reduce((s, w) => s + (w.durationMin ?? 0), 0),
    calories: week.reduce((s, w) => s + (w.calories ?? 0), 0),
  };
}
