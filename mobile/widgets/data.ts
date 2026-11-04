import { GOALS } from '@/constants/goals';
import { totalHydrationMl } from '@/services/hydration-service';
import { caloriesForDate } from '@/services/meal-service';
import { getDailyMetrics } from '@/services/metrics-service';
import { loadStreak } from '@/services/streak-service';
import { listWorkoutsBetween } from '@/services/workout-service';
import { todayStr } from '@/utils/dates';
import { sum } from '@/utils/helpers';
import type { TodaySnapshot } from './HomeWidgets';

/** Data for the "Today" home widget. Plain (unencrypted) data only: safe while the app is locked/closed. */
export async function loadTodaySnapshot(): Promise<TodaySnapshot> {
  const today = todayStr();
  const [m, kcal, waterMl, workouts] = await Promise.all([getDailyMetrics(today), caloriesForDate(today), totalHydrationMl(today), listWorkoutsBetween(today, today)]);
  return {
    steps: m?.steps ?? 0,
    goal: GOALS.steps,
    kcal,
    waterMl,
    waterGoalMl: GOALS.waterMl,
    moveMin: sum(workouts.map((w) => w.durationMin)),
  };
}

export { loadStreak };
