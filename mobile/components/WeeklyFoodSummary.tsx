import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

import { GlassCard } from '@/components/GlassCard';
import { listFoodBetween } from '@/services/meal-service';
import type { FoodLogEntry } from '@/types';
import { toDateStr } from '@/utils/dates';

interface WeeklyFoodSummaryProps {
  endDate: string;
  refreshKey?: number;
}

interface DailyTotal {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function dateFromString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function totalsForDate(date: string, meals: FoodLogEntry[]): DailyTotal {
  return meals
    .filter((meal) => meal.date === date)
    .reduce(
      (total, meal) => ({
        ...total,
        calories: total.calories + (meal.calories ?? 0),
        protein: total.protein + (meal.protein ?? 0),
        carbs: total.carbs + (meal.carbs ?? 0),
        fat: total.fat + (meal.fat ?? 0),
      }),
      { date, calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
}

export function WeeklyFoodSummary({ endDate, refreshKey = 0 }: WeeklyFoodSummaryProps) {
  const theme = useTheme();
  const [days, setDays] = useState<DailyTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const end = dateFromString(endDate);
        const start = addDays(end, -6);
        const meals = await listFoodBetween(toDateStr(start), endDate);
        if (active) {
          setDays(
            Array.from({ length: 7 }, (_, index) =>
              totalsForDate(toDateStr(addDays(start, index)), meals),
            ),
          );
          setError(null);
        }
      } catch {
        if (active) setError('Could not load the weekly food summary.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [endDate, refreshKey]);

  if (loading) return <ActivityIndicator style={styles.loading} />;
  if (error) return <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>;

  const total = days.reduce(
    (sum, day) => ({
      calories: sum.calories + day.calories,
      protein: sum.protein + day.protein,
      carbs: sum.carbs + day.carbs,
      fat: sum.fat + day.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <View style={styles.container}>
      <GlassCard contentStyle={styles.summary}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Seven-day totals
        </Text>
        <Text style={[styles.totalCalories, { color: theme.colors.primary }]}>
          {Math.round(total.calories)} kcal
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          Average {Math.round(total.calories / 7)} kcal/day
        </Text>
        <Text style={[styles.macros, { color: theme.colors.onSurfaceVariant }]}>
          Protein {Math.round(total.protein)}g · Carbs {Math.round(total.carbs)}g · Fat{' '}
          {Math.round(total.fat)}g
        </Text>
      </GlassCard>

      <GlassCard contentStyle={styles.daily}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Daily breakdown
        </Text>
        {days.map((day) => (
          <View key={day.date} style={styles.row}>
            <Text style={[styles.date, { color: theme.colors.onSurface }]}>{day.date}</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {Math.round(day.calories)} kcal · P {Math.round(day.protein)}g · C{' '}
              {Math.round(day.carbs)}g · F {Math.round(day.fat)}g
            </Text>
          </View>
        ))}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, marginTop: 12 },
  loading: { marginVertical: 32 },
  error: { marginTop: 16 },
  summary: { paddingVertical: 18 },
  totalCalories: { fontSize: 32, fontWeight: '800', marginTop: 8 },
  macros: { marginTop: 8, lineHeight: 20 },
  daily: { gap: 10 },
  row: { gap: 3, paddingVertical: 6 },
  date: { fontWeight: '700' },
});
