import { GOALS } from '@/constants/goals';
import { addDays, parseDateStr, todayStr } from '@/utils/dates';
import { activeDaysBetween, getUserRank } from './gamification-service';
import { getDailyMetrics } from './metrics-service';

/**
 * Streak snapshot shared by the in-app streak card (Plan) and the Android
 * home-screen widget. No UI imports: it also runs headless when the app is closed.
 */
export type DayState = 'done' | 'today' | 'missed' | 'future';

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export interface StreakSnapshot {
  streak: number;
  bestStreak: number;
  /** Monday → Sunday of the current week. */
  week: { label: string; date: string; state: DayState }[];
  steps: number;
  goal: number;
}

/** Monday of the week containing `date`. */
export function mondayOf(date: string): string {
  return addDays(date, -((parseDateStr(date).getDay() + 6) % 7));
}

/** Pure: day states for a week given the days with activity. */
export function weekStates(monday: string, activeDays: Iterable<string>, today: string): StreakSnapshot['week'] {
  const done = new Set(activeDays);
  return WEEKDAYS.map((label, i) => {
    const date = addDays(monday, i);
    const state: DayState = done.has(date) ? 'done' : date === today ? 'today' : date < today ? 'missed' : 'future';
    return { label, date, state };
  });
}

export async function loadStreak(): Promise<StreakSnapshot> {
  const today = todayStr();
  const monday = mondayOf(today);
  const [rank, active, metrics] = await Promise.all([getUserRank(), activeDaysBetween(monday, addDays(monday, 6)), getDailyMetrics(today)]);
  return {
    streak: rank.currentStreak,
    bestStreak: rank.bestStreak,
    week: weekStates(monday, active, today),
    steps: metrics?.steps ?? 0,
    goal: GOALS.steps,
  };
}
