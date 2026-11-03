import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Bars, Card, CardHead, CountUp, Empty, IconButton, ListItem, Ring, Row, Screen, Section, Text, Button } from '@/components/ui';
import { MetricsSheet, WorkoutSheet } from '@/components/forms/EntrySheets';
import { GOALS } from '@/constants/goals';
import { ON_PASTEL, ON_PASTEL_MUTED, space, useTheme, PASTEL_TRACK, PASTEL_DIM } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { calculateRecoveryScore } from '@/services/ai-engine';
import { listDailyMetricsBetween } from '@/services/metrics-service';
import { listWorkouts } from '@/services/workout-service';
import type { WorkoutEntry } from '@/types';
import { formatDate, lastNDays, todayStr, weekdayNarrow } from '@/utils/dates';

async function loadGym() {
  const today = todayStr();
  const days = lastNDays(7);
  const [workouts, metrics] = await Promise.all([listWorkouts(60), listDailyMetricsBetween(days[0], today)]);
  const week = workouts.filter((w) => w.date >= days[0]);
  const m = metrics.find((x) => x.date === today) ?? null;
  return {
    workouts,
    weekMin: week.reduce((s, w) => s + (w.durationMin ?? 0), 0),
    weekKcal: week.reduce((s, w) => s + (w.calories ?? 0), 0),
    sessions: week.length,
    perDay: days.map((d) => week.filter((w) => w.date === d).reduce((s, w) => s + (w.durationMin ?? 0), 0)),
    labels: days.map(weekdayNarrow),
    steps: m?.steps ?? null,
    sleep: m?.sleepHours ?? null,
    recovery: m?.recoveryScore ?? (m ? calculateRecoveryScore(m) : null),
  };
}

function advice(score: number | null): string {
  if (score == null) return 'Log sleep, heart rate and stress to get a recovery score.';
  if (score >= 75) return 'Green light — a hard session or PR attempt fits today.';
  if (score >= 55) return 'Moderate day — steady cardio or technique work.';
  return 'Recovery day — mobility, a walk, and an early night.';
}

export default function GymScreen() {
  const { tone } = useTheme();
  const { data } = useFocusData(useCallback(loadGym, []));
  const [sheet, setSheet] = useState<{ open: boolean; entry: WorkoutEntry | null }>({ open: false, entry: null });
  const [checkIn, setCheckIn] = useState(false);

  return (
    <Screen
      back
      eyebrow="Health"
      title="Gym & activity"
      subtitle="Training load, steps, sleep and recovery."
      right={<IconButton icon="plus" tone="ink" label="Log a workout" onPress={() => setSheet({ open: true, entry: null })} />}>
      <Card index={0} tone="sage">
        <CardHead label="This week" icon="dumbbell" tone="sage" />
        <View style={styles.hero}>
          <View style={styles.flex}>
            <CountUp value={data?.weekMin ?? 0} variant="display" color={ON_PASTEL} suffix=" min" />
            <Text variant="small" color={ON_PASTEL_MUTED}>
              {data?.sessions ?? 0} sessions · {data?.weekKcal ?? 0} kcal burned
            </Text>
          </View>
          <Ring progress={(data?.weekMin ?? 0) / GOALS.workoutMinPerWeek} color={ON_PASTEL} track={PASTEL_TRACK} size={80}>
            <Text variant="label" color={ON_PASTEL} style={{ fontSize: 10 }}>
              {Math.round(((data?.weekMin ?? 0) / GOALS.workoutMinPerWeek) * 100)}%
            </Text>
          </Ring>
        </View>
        <View style={{ marginTop: space.md }}>
          <Bars values={data?.perDay ?? Array(7).fill(0)} labels={data?.labels} labelColor={ON_PASTEL_MUTED} color={ON_PASTEL} dim={PASTEL_DIM} highlight={6} barWidth={14} height={70} />
        </View>
      </Card>

      <Row>
        <Card index={1} style={styles.flex} onPress={() => setCheckIn(true)} accessibilityLabel="Steps today, tap to update">
          <CardHead label="Steps" icon="shoe-print" />
          <Text variant="num">{data?.steps != null ? data.steps.toLocaleString() : '–'}</Text>
          <Text variant="small" muted>
            goal {GOALS.steps.toLocaleString()}
          </Text>
        </Card>
        <Card index={2} tone="lavender" style={styles.flex} onPress={() => setCheckIn(true)} accessibilityLabel="Sleep, tap to update">
          <CardHead label="Sleep" icon="weather-night" tone="lavender" />
          <Text variant="num" color={ON_PASTEL}>
            {data?.sleep ?? '–'}
            <Text variant="small" color={ON_PASTEL_MUTED}>
              {' '}
              h
            </Text>
          </Text>
          <Text variant="small" color={ON_PASTEL_MUTED}>
            goal {GOALS.sleepHours} h
          </Text>
        </Card>
      </Row>

      <Card index={3} tone="accent" onPress={() => setCheckIn(true)}>
        <CardHead label="Recovery" icon="lightning-bolt" tone="accent" />
        <Text variant="display" color="#fff">
          {data?.recovery ?? '–'}
        </Text>
        <Text variant="small" color={tone('accent').muted}>
          {advice(data?.recovery ?? null)}
        </Text>
      </Card>

      <Section title="Workouts" />
      {data?.workouts.map((w, i) => (
        <ListItem
          key={w.id}
          index={i}
          icon="dumbbell"
          iconTone="sage"
          title={w.name}
          subtitle={[formatDate(w.date), w.durationMin && `${w.durationMin} min`, w.intensity && `intensity ${w.intensity}/5`].filter(Boolean).join(' · ')}
          value={w.calories != null ? `${w.calories} kcal` : undefined}
          onPress={() => setSheet({ open: true, entry: w })}
        />
      ))}
      {data && data.workouts.length === 0 ? (
        <Empty icon="dumbbell" title="No workouts yet" body="Log your first session to start your streak." action={<Button label="Log workout" small onPress={() => setSheet({ open: true, entry: null })} />} />
      ) : null}

      <WorkoutSheet open={sheet.open} entry={sheet.entry} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
      <MetricsSheet open={checkIn} onClose={() => setCheckIn(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
