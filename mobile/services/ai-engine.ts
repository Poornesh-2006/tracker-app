import type { DailyMetrics, FoodLogEntry, WorkoutEntry } from '@/types';
import type { HealthAlert } from '@/constants/metrics';
import { average, clamp } from '@/utils/helpers';
import { daysAgo } from '@/utils/dates';

export interface RecoveryFactors {
  sleepHours: number | null;
  stress: number | null;
  heartRate: number | null;
}

/** Non-null values of `key` across rows. */
function values<T, K extends keyof T>(rows: T[], key: K): number[] {
  return rows.map((r) => r[key]).filter((v): v is NonNullable<T[K]> & number => v != null);
}

/**
 * Base 50, up to +20 each for sleep, resting HR and stress; clamped to 0-100.
 * Null when no factor is known.
 */
export function calculateRecoveryScore(f: RecoveryFactors): number | null {
  if (f.sleepHours == null && f.stress == null && f.heartRate == null) return null;

  let score = 50;
  if (f.sleepHours != null) {
    if (f.sleepHours >= 7 && f.sleepHours <= 9) score += 20;
    else if ((f.sleepHours >= 5 && f.sleepHours < 7) || (f.sleepHours > 9 && f.sleepHours <= 10)) score += 10;
  }
  if (f.heartRate != null) {
    if (f.heartRate >= 60 && f.heartRate <= 100) score += 20;
    else if ((f.heartRate >= 50 && f.heartRate < 60) || (f.heartRate > 100 && f.heartRate <= 120)) score += 10;
  }
  if (f.stress != null) {
    if (f.stress >= 1 && f.stress <= 3) score += 20;
    // > 3, not >= 4: a decimal like 3.5 used to fall into a gap and score as badly as 7+.
    else if (f.stress > 3 && f.stress <= 6) score += 10;
  }
  return clamp(score, 0, 100);
}

/** 7-entry stress average, nudged by the last 3 entries' sleep. 1-10, or null. */
export function predictStress(metrics: DailyMetrics[]): number | null {
  const avg = average(values(metrics.slice(-7), 'stress'));
  if (avg == null) return null;
  const avgSleep = average(values(metrics.slice(-3), 'sleepHours'));
  let predicted = avg;
  if (avgSleep != null && avgSleep < 6) predicted += 1.5;
  if (avgSleep != null && avgSleep > 8) predicted -= 0.5;
  return clamp(Math.round(predicted), 1, 10);
}

export interface Insight {
  level: 'positive' | 'warning' | 'info';
  title: string;
  message: string;
}

export interface InsightData {
  metrics: DailyMetrics[];
  workouts: WorkoutEntry[];
  meals?: FoodLogEntry[];
}

function sliceWindow<T extends { date: string }>(rows: T[], fromDate: string, toDate: string): T[] {
  return rows.filter((v) => v.date >= fromDate && v.date <= toDate);
}

export function generateInsights(data: InsightData): Insight[] {
  const insights: Insight[] = [];
  const { metrics, workouts } = data;
  // Two non-overlapping 7-day windows: [today-6, today] and [today-13, today-7].
  const today = daysAgo(0);
  const weekStart = daysAgo(6);
  const thisWeek = sliceWindow(metrics, weekStart, today);
  const lastWeek = sliceWindow(metrics, daysAgo(13), daysAgo(7));

  const sleepNow = average(values(thisWeek, 'sleepHours'));
  const sleepBefore = average(values(lastWeek, 'sleepHours'));
  if (sleepNow != null && sleepBefore != null) {
    const diff = sleepNow - sleepBefore;
    if (diff >= 0.5) {
      insights.push({ level: 'positive', title: 'Sleep improving', message: `Your average sleep is up ${diff.toFixed(1)}h this week (${sleepNow.toFixed(1)}h).` });
    } else if (diff <= -0.5) {
      insights.push({ level: 'warning', title: 'Sleep declining', message: `Your average sleep dropped ${Math.abs(diff).toFixed(1)}h this week (${sleepNow.toFixed(1)}h).` });
    }
  }

  const stepsNow = average(values(thisWeek, 'steps'));
  if (stepsNow != null) {
    if (stepsNow < 5000) {
      insights.push({ level: 'warning', title: 'Low activity', message: `Averaging ${Math.round(stepsNow)} steps/day — try for at least 7,000.` });
    } else if (stepsNow >= 7000) {
      insights.push({ level: 'positive', title: 'Staying active', message: `Averaging ${Math.round(stepsNow)} steps/day this week.` });
    }
  }

  const weekWorkouts = sliceWindow(workouts, weekStart, today).length;
  if (weekWorkouts === 0) {
    insights.push({ level: 'info', title: 'No workouts this week', message: 'Even a 20-minute walk counts toward your training load.' });
  } else if (weekWorkouts >= 3) {
    insights.push({ level: 'positive', title: 'Consistent training', message: `${weekWorkouts} workouts logged in the last 7 days.` });
  } else {
    insights.push({ level: 'info', title: 'Light training week', message: `${weekWorkouts} workout(s) logged in the last 7 days.` });
  }

  const weightNow = average(values(thisWeek, 'weight'));
  const weightBefore = average(values(lastWeek, 'weight'));
  if (weightNow != null && weightBefore != null) {
    const diff = weightNow - weightBefore;
    if (Math.abs(diff) >= 0.5) {
      const direction = diff > 0 ? 'up' : 'down';
      insights.push({ level: 'info', title: `Weight trending ${direction}`, message: `Your average weight changed ${Math.abs(diff).toFixed(1)}kg versus the week before.` });
    }
  }

  const recoveryTrend = metrics.filter((m) => m.recoveryScore != null).slice(-7);
  if (recoveryTrend.length >= 3) {
    const first = recoveryTrend[0].recoveryScore!;
    const last = recoveryTrend[recoveryTrend.length - 1].recoveryScore!;
    const delta = last - first;
    if (delta >= 10) {
      insights.push({ level: 'positive', title: 'Recovery rising', message: `Recovery score moved from ${first} to ${last} recently.` });
    } else if (delta <= -10) {
      insights.push({ level: 'warning', title: 'Recovery falling', message: `Recovery score moved from ${first} to ${last} recently. Consider more rest.` });
    }
  }

  return insights;
}

export function checkMetricsAlerts(metrics: DailyMetrics[]): HealthAlert[] {
  const alerts: HealthAlert[] = [];
  if (metrics.length === 0) return alerts;
  const latest = metrics[metrics.length - 1];

  if (latest.heartRate != null && latest.heartRate > 90) {
    alerts.push({
      level: 'high',
      title: 'Elevated resting heart rate',
      message: `Latest resting heart rate is ${latest.heartRate} bpm, above the typical 60-80 range.`,
    });
  }
  if (latest.sleepHours != null && latest.sleepHours < 6) {
    alerts.push({
      level: 'low',
      title: 'Short sleep',
      message: `Latest sleep was ${latest.sleepHours}h — below the recommended 7-9h.`,
    });
  }
  if (latest.stress != null && latest.stress >= 8) {
    alerts.push({
      level: 'high',
      title: 'High stress',
      message: `Latest stress level is ${latest.stress}/10. Consider a rest or breathing exercise.`,
    });
  }
  return alerts;
}
