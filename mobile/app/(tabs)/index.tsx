import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Bars,
  Button,
  Card,
  CardHead,
  CountUp,
  DotMatrix,
  Meter,
  Ring,
  Row,
  Screen,
  Section,
  Tap,
  Text,
  toast,
} from '@/components/ui';
import { MetricsSheet } from '@/components/forms/EntrySheets';
import { accent, ON_PASTEL, ON_PASTEL_MUTED, pastel, space, useTheme } from '@/constants/theme';
import { GOALS, greeting } from '@/constants/goals';
import { RANKS } from '@/constants/gamification';
import { computeAlerts } from '@/constants/metrics';
import { useFocusData } from '@/hooks/useFocusData';
import { bumpData } from '@/hooks/useDataVersion';
import { calculateRecoveryScore, checkMetricsAlerts, generateInsights, predictStress } from '@/services/ai-engine';
import { listBloodTests } from '@/services/blood-test-service';
import { getUserRank } from '@/services/gamification-service';
import { addHydration, totalHydrationMl } from '@/services/hydration-service';
import { caloriesForDate } from '@/services/meal-service';
import { listDailyMetricsBetween } from '@/services/metrics-service';
import { listTodos, setTodoDone } from '@/services/todo-service';
import { listWorkouts } from '@/services/workout-service';
import { daysAgo, parseDateStr, todayStr } from '@/utils/dates';
import { errorMessage } from '@/utils/helpers';

async function loadToday() {
  const today = todayStr();
  const [metrics, calories, waterMl, workouts, todos, rank, blood] = await Promise.all([
    listDailyMetricsBetween(daysAgo(13), today),
    caloriesForDate(today),
    totalHydrationMl(today),
    listWorkouts(60),
    listTodos(),
    getUserRank(),
    listBloodTests(50),
  ]);
  const byDate = new Map(metrics.map((m) => [m.date, m]));
  const m = byDate.get(today) ?? null;
  const week = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));
  const todayWorkouts = workouts.filter((w) => w.date === today);
  const recovery = m?.recoveryScore ?? (m ? calculateRecoveryScore({ sleepHours: m.sleepHours, heartRate: m.heartRate, stress: m.stress }) : null);
  const alerts = [...computeAlerts(blood), ...checkMetricsAlerts(metrics)];
  return {
    m,
    calories,
    waterMl,
    recovery,
    stress: predictStress(metrics),
    weekSteps: week.map((d) => byDate.get(d)?.steps ?? 0),
    weekLabels: week.map((d) => parseDateStr(d).toLocaleDateString('en-US', { weekday: 'narrow' })),
    workoutMin: todayWorkouts.reduce((s, w) => s + (w.durationMin ?? 0), 0),
    burned: todayWorkouts.reduce((s, w) => s + (w.calories ?? 0), 0),
    openTodos: todos.filter((t) => !t.done).slice(0, 4),
    openCount: todos.filter((t) => !t.done).length,
    rank,
    insight: generateInsights({ metrics, workouts })[0] ?? null,
    alert: alerts[0] ?? null,
  };
}

export default function TodayScreen() {
  const { c, tone } = useTheme();
  const { data, reload, loading } = useFocusData(useCallback(loadToday, []));
  const [checkIn, setCheckIn] = useState(false);
  const now = new Date();

  const addGlass = async () => {
    try {
      await addHydration(todayStr(), GOALS.glassMl);
      bumpData();
      toast(`+${GOALS.glassMl} ml water`, 'cup-water');
    } catch (e) {
      toast(errorMessage(e, 'Could not log water.'), 'alert-circle');
    }
  };

  const toggleTodo = async (id: number, done: boolean) => {
    await setTodoDone(id, done);
    bumpData();
  };

  const steps = data?.m?.steps ?? 0;
  const glasses = Math.round((data?.waterMl ?? 0) / GOALS.glassMl);
  const goalGlasses = GOALS.waterMl / GOALS.glassMl;
  const rankDef = RANKS[(data?.rank.currentRank ?? 1) - 1] ?? RANKS[0];
  const t = (k: Parameters<typeof tone>[0]) => tone(k);

  return (
    <Screen
      refreshing={loading && !!data}
      onRefresh={reload}
      eyebrow={now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
      title={greeting(now)}
      right={
        <Tap onPress={() => router.push('/(tabs)/me' as Href)} style={[styles.avatar, { backgroundColor: pastel.butter }]} accessibilityLabel={`Profile, ${rankDef.name}, ${data?.rank.totalPoints ?? 0} points`}>
          <Text style={{ fontSize: 20 }}>{rankDef.icon}</Text>
        </Tap>
      }>
      {/* Hero: steps */}
      <Card index={0} onPress={() => setCheckIn(true)} accessibilityLabel={`Steps today ${steps}. Tap to update check-in.`}>
        <CardHead label="Steps today" icon="shoe-print" />
        <View style={styles.heroRow}>
          <View style={{ flex: 1, gap: space.md }}>
            <DotMatrix text={steps.toLocaleString('en-US')} dot={7} />
            <View style={styles.miniStats}>
              <Mini value={data?.m?.sleepHours != null ? `${data.m.sleepHours}` : '–'} unit="h sleep" />
              <Mini value={`${data?.calories ?? 0}`} unit="kcal in" />
              <Mini value={`${data?.workoutMin ?? 0}`} unit="min move" />
            </View>
          </View>
          <Ring progress={steps / GOALS.steps} color={accent.tangerine} size={74} stroke={9}>
            <Text variant="label" style={{ fontSize: 10 }}>
              {Math.min(999, Math.round((steps / GOALS.steps) * 100))}%
            </Text>
          </Ring>
        </View>
      </Card>

      <Row>
        {/* Recovery */}
        <Card index={1} tone="accent" style={styles.flex} onPress={() => router.push('/(tabs)/health/gym' as Href)}>
          <CardHead label="Recovery" icon="lightning-bolt" tone="accent" />
          {data?.recovery != null ? (
            <CountUp value={data.recovery} variant="display" color="#fff" />
          ) : (
            <Text variant="display" color="#fff">
              –
            </Text>
          )}
          <Text variant="small" color={t('accent').muted}>
            {data?.recovery == null ? 'Check in to score' : data.recovery >= 75 ? 'Ready to push' : data.recovery >= 55 ? 'Train steady' : 'Take it easy'}
          </Text>
        </Card>

        {/* Water */}
        <Card index={2} tone="sky" style={styles.flex} onPress={() => void addGlass()} accessibilityLabel={`Water ${glasses} of ${goalGlasses} glasses. Tap to add a glass.`}>
          <CardHead label="Water" tone="sky" right={<MaterialCommunityIcons name="plus-circle" size={20} color={ON_PASTEL} />} />
          <Text variant="display" color={ON_PASTEL}>
            {glasses}
            <Text variant="h2" color={ON_PASTEL_MUTED}>
              /{goalGlasses}
            </Text>
          </Text>
          <View style={styles.drops}>
            {Array.from({ length: goalGlasses }, (_, i) => (
              <MaterialCommunityIcons key={i} name={i < glasses ? 'water' : 'water-outline'} size={14} color={ON_PASTEL} />
            ))}
          </View>
        </Card>
      </Row>

      <Row>
        <Card index={3} style={styles.flex} onPress={() => setCheckIn(true)}>
          <CardHead label="Heart rate" icon="heart-pulse" />
          <Text variant="num">
            {data?.m?.heartRate ?? '–'}
            <Text variant="small" muted>
              {' '}
              bpm
            </Text>
          </Text>
          <Text variant="small" muted>
            Resting
          </Text>
        </Card>
        <Card index={4} tone="lavender" style={styles.flex} onPress={() => setCheckIn(true)}>
          <CardHead label="Stress" icon="weather-windy" tone="lavender" />
          <Text variant="num" color={ON_PASTEL}>
            {data?.m?.stress ?? data?.stress ?? '–'}
            <Text variant="small" color={ON_PASTEL_MUTED}>
              /10
            </Text>
          </Text>
          <Text variant="small" color={ON_PASTEL_MUTED}>
            {data?.m?.stress != null ? 'Logged today' : data?.stress != null ? 'Predicted' : 'Not logged'}
          </Text>
        </Card>
      </Row>

      {/* Week */}
      <Card index={5} tone="butter">
        <CardHead label="Steps · last 7 days" icon="chart-bar" tone="butter" />
        <Bars values={data?.weekSteps ?? Array(7).fill(0)} labels={data?.weekLabels} labelColor={ON_PASTEL_MUTED} color={ON_PASTEL} dim="rgba(20,20,19,0.25)" highlight={6} height={84} barWidth={14} />
      </Card>

      {data?.alert ? (
        <Card index={6} tone="blush" onPress={() => router.push('/(tabs)/health/body' as Href)}>
          <CardHead label="Heads up" icon="alert-circle-outline" tone="blush" />
          <Text variant="title" color={ON_PASTEL}>
            {data.alert.title}
          </Text>
          <Text variant="small" color={ON_PASTEL_MUTED}>
            {data.alert.message}
          </Text>
        </Card>
      ) : null}

      {data?.insight ? (
        <Card index={7} tone="ink" onPress={() => router.push('/(tabs)/brain/insights' as Href)}>
          <CardHead label="Insight" icon="creation" tone="ink" />
          <Text variant="h2" color={c.onInk}>
            {data.insight.title}
          </Text>
          <Text variant="small" color={t('ink').muted}>
            {data.insight.message}
          </Text>
        </Card>
      ) : null}

      <Section title="Today’s tasks" right={<Button label={`All ${data?.openCount ?? 0}`} kind="ghost" small onPress={() => router.push('/(tabs)/plan' as Href)} />} />
      <Card index={8}>
        {data && data.openTodos.length ? (
          <View style={{ gap: space.md }}>
            {data.openTodos.map((todo) => (
              <Tap key={todo.id} onPress={() => void toggleTodo(todo.id, true)} style={styles.todo} accessibilityRole="checkbox" accessibilityState={{ checked: false }} accessibilityLabel={todo.title}>
                <View style={[styles.check, { borderColor: c.ink }]} />
                <Text style={styles.flex} numberOfLines={1}>
                  {todo.title}
                </Text>
                {todo.dueDate ? (
                  <Text variant="small" muted>
                    {todo.dueDate === todayStr() ? 'Today' : todo.dueDate.slice(5)}
                  </Text>
                ) : null}
              </Tap>
            ))}
          </View>
        ) : (
          <Text muted>Nothing open. Tap + to add a task.</Text>
        )}
      </Card>

      {/* Rank strip */}
      <Card index={9} onPress={() => router.push('/(tabs)/me' as Href)}>
        <CardHead label={`${rankDef.name} · ${data?.rank.currentStreak ?? 0}-day streak`} icon="trophy-outline" />
        <Text variant="num">
          {(data?.rank.totalPoints ?? 0).toLocaleString()}
          <Text variant="small" muted>
            {' '}
            points to spend
          </Text>
        </Text>
        <View style={{ marginTop: space.sm }}>
          <Meter progress={(data?.rank.weeklyPoints ?? 0) / 500} color={accent.tangerine} />
        </View>
        <Text variant="small" muted style={{ marginTop: 6 }}>
          {data?.rank.weeklyPoints ?? 0} this week
        </Text>
      </Card>

      <MetricsSheet open={checkIn} onClose={() => setCheckIn(false)} />
    </Screen>
  );
}

function Mini({ value, unit }: { value: string; unit: string }) {
  return (
    <View>
      <Text variant="title">{value}</Text>
      <Text variant="small" muted>
        {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  miniStats: { flexDirection: 'row', gap: space.lg },
  drops: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: space.sm },
  todo: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 32 },
  check: { width: 22, height: 22, borderRadius: 8, borderWidth: 2 },
});
