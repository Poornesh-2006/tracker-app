import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, CardHead, DotMatrix, Icon, Pie, Row, Screen, Section, Tap, Text } from '@/components/ui';
import { MetricsSheet } from '@/components/forms/EntrySheets';
import { attempt, logWater } from '@/components/forms/actions';
import { ActivityWidget } from '@/components/widgets/ActivityWidget';
import { brand, fonts, radii, space, useTheme } from '@/constants/theme';
import { GOALS, greeting } from '@/constants/goals';
import { RANKS } from '@/constants/gamification';
import { computeAlerts } from '@/constants/metrics';
import { useFocusData } from '@/hooks/useFocusData';
import { calculateRecoveryScore, checkMetricsAlerts, generateInsights, predictStress } from '@/services/ai-engine';
import { listBloodTests } from '@/services/blood-test-service';
import { getUserRank } from '@/services/gamification-service';
import { totalHydrationMl } from '@/services/hydration-service';
import { caloriesForDate } from '@/services/meal-service';
import { listDailyMetricsBetween } from '@/services/metrics-service';
import { syncLatest } from '@/services/sync-manager';
import { listTodos, setTodoDone } from '@/services/todo-service';
import { listWorkouts } from '@/services/workout-service';
import { useSettingsStore } from '@/stores/settings';
import { isAccountRequired, useSupabaseAuthStore } from '@/stores/supabase-auth';
import { daysAgo, todayStr } from '@/utils/dates';
import { sum } from '@/utils/helpers';

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
  const m = metrics.find((x) => x.date === today) ?? null;
  const todayW = workouts.filter((w) => w.date === today);
  const weekW = workouts.filter((w) => w.date >= daysAgo(6));
  return {
    m,
    calories,
    waterMl,
    recovery: m?.recoveryScore ?? (m ? calculateRecoveryScore(m) : null),
    stress: m?.stress ?? predictStress(metrics),
    stressLogged: m?.stress != null,
    todayMin: sum(todayW.map((w) => w.durationMin)),
    todayKcal: sum(todayW.map((w) => w.calories)),
    todaySessions: todayW.length,
    weekMin: sum(weekW.map((w) => w.durationMin)),
    weekKcal: sum(weekW.map((w) => w.calories)),
    weekSessions: weekW.length,
    openTodos: todos
      .filter((t) => !t.done)
      .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
      .slice(0, 4),
    openCount: todos.filter((t) => !t.done).length,
    rank,
    insight: generateInsights({ metrics, workouts })[0] ?? null,
    alert: [...computeAlerts(blood), ...checkMetricsAlerts(metrics)][0] ?? null,
  };
}

function sleepWord(h: number | null | undefined): string {
  if (h == null) return '–';
  if (h >= 7) return 'Good';
  if (h >= 6) return 'Fair';
  return 'Short';
}

const fmtSleep = (h: number) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}min`;

export default function TodayScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, reload, loading } = useFocusData(useCallback(loadToday, []));
  const [checkIn, setCheckIn] = useState(false);
  const now = new Date();

  // Auto-sync (Settings): push today's entries when Today opens, quietly.
  const syncEnabled = useSettingsStore((s) => s.syncEnabled);
  const signedIn = useSupabaseAuthStore((s) => s.status === 'signedIn');
  useFocusEffect(
    useCallback(() => {
      if (syncEnabled && signedIn && isAccountRequired()) void syncLatest().catch(() => undefined);
    }, [syncEnabled, signedIn]),
  );

  const steps = data?.m?.steps ?? 0;
  const glasses = Math.round((data?.waterMl ?? 0) / GOALS.glassMl);
  const goalGlasses = GOALS.waterMl / GOALS.glassMl;
  const rankDef = RANKS[(data?.rank.currentRank ?? 1) - 1] ?? RANKS[0];
  const openCheckIn = () => setCheckIn(true);

  const header = (
    <Animated.View entering={FadeInUp.springify().damping(18)} style={{ paddingTop: insets.top > 0 ? 0 : space.sm, gap: space.lg }}>
      <View style={styles.topRow}>
        <View style={[styles.todayPill, { backgroundColor: c.ink }]}>
          <Text variant="label" color={c.canvas}>
            Today
          </Text>
        </View>
        <Text variant="small" muted style={styles.flex}>
          {greeting(now)} · {now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
        </Text>
        <Tap onPress={() => router.push('/(tabs)/me' as Href)} style={[styles.avatar, { backgroundColor: c.surface }]} accessibilityLabel={`Profile, ${rankDef.name}, ${data?.rank.totalPoints ?? 0} points`}>
          <Text style={{ fontSize: 20 }}>{rankDef.icon}</Text>
        </Tap>
      </View>

      <Tap onPress={openCheckIn} scaleTo={0.98} style={styles.hero} accessibilityLabel={`${steps} steps today, ${Math.round((steps / GOALS.steps) * 100)}% of goal. Tap to update.`}>
        <View style={styles.flex}>
          <DotMatrix text={steps.toLocaleString('en-US')} dot={8} />
        </View>
        <Pie progress={steps / GOALS.steps} size={70} color={brand.orange} track={c.surfaceAlt} />
      </Tap>

      <View style={styles.statsRow}>
        <BigStat value={data?.m?.sleepHours != null ? `${data.m.sleepHours}` : '–'} unit="h sleep" />
        <BigStat value={`${data?.calories ?? 0}`} unit="Kcal" />
        <BigStat value={`${data?.todayMin ?? 0}`} unit="Min" />
      </View>
    </Animated.View>
  );

  return (
    <Screen refreshing={loading && !!data} onRefresh={reload} header={header}>
      {/* Bento: Exercise (orange) | Stress + Water pills */}
      <Row>
        <Card index={0} tone="accent" style={styles.flex} onPress={() => router.push('/(tabs)/health/gym' as Href)} accessibilityLabel="Exercise today">
          <CardHead label="Exercise" icon="run" />
          <Text variant="small" muted style={{ marginTop: -6 }}>
            {now.toLocaleDateString('en-US', { weekday: 'short' })}
          </Text>
          <View style={{ marginTop: space.lg, gap: 2 }}>
            <Line value={`${data?.todayMin ?? 0}`} unit="Min" />
            <Line value={`${data?.todayKcal ?? 0}`} unit="KCal" />
            <Line value={`${data?.todaySessions ?? 0}`} unit={data?.todaySessions === 1 ? 'Session' : 'Sessions'} />
          </View>
        </Card>
        <View style={[styles.flex, { gap: space.md }]}>
          <Card index={1} style={styles.pillCard} onPress={openCheckIn} accessibilityLabel="Stress">
            <View style={styles.pillRow}>
              <Text variant="num">{data?.stress ?? '–'}</Text>
              <Icon name={data?.stress != null && data.stress >= 7 ? 'emoticon-sad-outline' : 'emoticon-happy-outline'} size={24} />
            </View>
            <Text variant="label" style={{ fontSize: 10 }}>
              Stress <Text variant="small" muted>/ {data?.stressLogged ? 'today' : 'predicted'}</Text>
            </Text>
          </Card>
          <Card index={2} style={styles.pillCard} onPress={() => void logWater(todayStr(), GOALS.glassMl)} accessibilityLabel={`Water ${glasses} of ${goalGlasses} glasses. Tap to add a glass.`}>
            <View style={styles.pillRow}>
              <Text variant="num">
                {glasses}
                <Text variant="small" muted>
                  /{goalGlasses}
                </Text>
              </Text>
              <Icon name="cup-water" size={24} color={glasses ? brand.orange : undefined} />
            </View>
            <Text variant="label" style={{ fontSize: 10 }}>
              Water <Text variant="small" muted>/ tap +1</Text>
            </Text>
          </Card>
        </View>
      </Row>

      {/* Heart rate | Sleep */}
      <Row>
        <Card index={3} style={[styles.flex, styles.tall]} onPress={openCheckIn} accessibilityLabel="Heart rate">
          <CardHead label="Heart rate" icon="heart-pulse" />
          <Text variant="small" muted style={{ marginTop: -6 }}>
            Resting
          </Text>
          <View style={styles.flex} />
          <Text variant="num">{data?.m?.heartRate ?? '–'}</Text>
          <Text variant="label" style={{ fontSize: 10 }}>
            BPM
          </Text>
        </Card>
        <Card index={4} tone="soft" style={[styles.flex, styles.tall]} onPress={openCheckIn} accessibilityLabel="Sleep">
          <CardHead label="Sleep" icon="bed-outline" />
          <Text variant="small" muted style={{ marginTop: -6 }}>
            Last night
          </Text>
          <View style={styles.flex} />
          <Text variant="num">{sleepWord(data?.m?.sleepHours)}</Text>
          <Text variant="label" style={{ fontSize: 10 }}>
            {data?.m?.sleepHours != null ? fmtSleep(data.m.sleepHours) : 'Not logged'}
          </Text>
        </Card>
      </Row>

      <ActivityWidget
        weekMin={data?.weekMin ?? 0}
        goalMin={GOALS.workoutMinPerWeek}
        heartRate={data?.m?.heartRate ?? null}
        kcal={data?.weekKcal ?? 0}
        sessions={data?.weekSessions ?? 0}
        streak={data?.rank.currentStreak ?? 0}
        onPress={() => router.push('/(tabs)/health/gym' as Href)}
      />

      <Card index={7} onPress={openCheckIn}>
        <CardHead label="Recovery" icon="lightning-bolt" />
        <View style={styles.pillRow}>
          <Text variant="num">{data?.recovery ?? '–'}</Text>
          <Text variant="small" muted>
            {data?.recovery == null ? 'Check in to score' : data.recovery >= 75 ? 'Ready to push' : data.recovery >= 55 ? 'Train steady' : 'Take it easy'}
          </Text>
        </View>
      </Card>

      {data?.alert ? (
        <Card index={8} onPress={() => router.push('/(tabs)/health/body' as Href)}>
          <CardHead label="Heads up" icon="alert-circle-outline" right={<Icon name="alert-circle-outline" color={brand.orange} />} />
          <Text variant="title">{data.alert.title}</Text>
          <Text variant="small" muted>
            {data.alert.message}
          </Text>
        </Card>
      ) : null}

      <Section title="Up next" right={<Button label={`All ${data?.openCount ?? 0}`} kind="ghost" small onPress={() => router.push('/(tabs)/plan' as Href)} />} />
      <Card index={9}>
        {data && data.openTodos.length ? (
          <View style={{ gap: space.md }}>
            {data.openTodos.map((todo) => (
              <Tap
                key={todo.id}
                onPress={() => void attempt(() => setTodoDone(todo.id, true), 'Could not update the task.')}
                style={styles.todo}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: false }}
                accessibilityLabel={todo.title}>
                <View style={[styles.check, { borderColor: brand.orange }]} />
                <Text style={styles.flex} numberOfLines={1}>
                  {todo.title}
                </Text>
                {todo.dueDate ? (
                  <Text variant="small" muted>
                    {todo.dueDate === todayStr() ? 'Today' : todo.dueDate < todayStr() ? 'Overdue' : todo.dueDate.slice(5)}
                  </Text>
                ) : null}
              </Tap>
            ))}
          </View>
        ) : (
          <Text muted>Nothing open. Tap + to add a task.</Text>
        )}
      </Card>

      {data?.insight ? (
        <Card index={10} tone="ink" onPress={() => router.push('/(tabs)/brain/insights' as Href)}>
          <CardHead label="Insight" icon="creation" />
          <Text variant="h2">{data.insight.title}</Text>
          <Text variant="small" muted>
            {data.insight.message}
          </Text>
        </Card>
      ) : null}

      <MetricsSheet open={checkIn} onClose={() => setCheckIn(false)} />
    </Screen>
  );
}

/** "119 Min" — thin number, bold unit. */
function BigStat({ value, unit }: { value: string; unit: string }) {
  return (
    <Text style={styles.bigStat}>
      {value}
      <Text variant="title" style={{ fontSize: 14 }}>
        {' '}
        {unit}
      </Text>
    </Text>
  );
}

/** Exercise card line: "32  Min". */
function Line({ value, unit }: { value: string; unit: string }) {
  return (
    <Text style={styles.line}>
      {value}
      <Text variant="title" style={{ fontSize: 13 }}>
        {'  '}
        {unit}
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  todayPill: { borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 6 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.lg },
  bigStat: { fontFamily: fonts.numLight, fontSize: 36, lineHeight: 42, letterSpacing: -1 },
  line: { fontFamily: fonts.numLight, fontSize: 30, lineHeight: 36, color: '#FFFFFF' },
  pillCard: { borderRadius: 40, paddingHorizontal: space.xl, paddingVertical: space.md, flex: 1, justifyContent: 'center' },
  pillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tall: { minHeight: 196 },
  todo: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 32 },
  check: { width: 22, height: 22, borderRadius: 8, borderWidth: 2 },
});
