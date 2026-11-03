import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Card, CardHead, CountUp, Meter, Row, Screen, Text } from '@/components/ui';
import { ON_PASTEL, ON_PASTEL_MUTED, space, useTheme, PASTEL_TRACK } from '@/constants/theme';
import { GOALS } from '@/constants/goals';
import { summarizeRegions } from '@/constants/body-map';
import { useFocusData } from '@/hooks/useFocusData';
import { listBloodTests } from '@/services/blood-test-service';
import { listRoutines } from '@/services/grooming-service';
import { totalHydrationMl } from '@/services/hydration-service';
import { caloriesForDate } from '@/services/meal-service';
import { listWorkouts } from '@/services/workout-service';
import { daysAgo, todayStr } from '@/utils/dates';

async function loadHealth() {
  const today = todayStr();
  const [blood, kcal, water, workouts, routines] = await Promise.all([
    listBloodTests(200),
    caloriesForDate(today),
    totalHydrationMl(today),
    listWorkouts(100),
    listRoutines(),
  ]);
  const regions = Object.values(summarizeRegions(blood));
  const weekStart = daysAgo(6);
  const week = workouts.filter((w) => w.date >= weekStart);
  return {
    labs: blood.length,
    flagged: regions.filter((r) => r.status === 'low' || r.status === 'high').length,
    kcal,
    water,
    weekMin: week.reduce((s, w) => s + (w.durationMin ?? 0), 0),
    weekSessions: week.length,
    routines: routines.filter((r) => r.active).length,
  };
}

const go = (path: string) => () => router.push(path as Href);

export default function HealthHub() {
  const { c } = useTheme();
  const { data } = useFocusData(useCallback(loadHealth, []));

  return (
    <Screen eyebrow="Health" title="Your body, by system." subtitle="Labs, fuel, movement and care — tap a card to dive in.">
      <Card index={0} tone="lavender" onPress={go('/(tabs)/health/body')} accessibilityLabel="Body and labs">
        <CardHead label="Body & labs" icon="human" tone="lavender" />
        <View style={styles.split}>
          <View>
            <CountUp value={data?.labs ?? 0} variant="display" color={ON_PASTEL} />
            <Text variant="small" color={ON_PASTEL_MUTED}>
              encrypted results
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: data?.flagged ? '#FF5A1F' : 'rgba(20,20,19,0.08)' }]}>
            <Text variant="label" color={data?.flagged ? '#fff' : ON_PASTEL}>
              {data?.flagged ? `${data.flagged} to watch` : 'All clear'}
            </Text>
          </View>
        </View>
      </Card>

      <Row>
        <Card index={1} tone="peach" style={styles.flex} onPress={go('/(tabs)/health/fuel')} accessibilityLabel="Fuel">
          <CardHead label="Fuel" icon="food-apple-outline" tone="peach" />
          <CountUp value={data?.kcal ?? 0} color={ON_PASTEL} />
          <Text variant="small" color={ON_PASTEL_MUTED}>
            kcal today
          </Text>
          <View style={{ marginTop: space.md }}>
            <Meter progress={(data?.water ?? 0) / GOALS.waterMl} color={ON_PASTEL} track={PASTEL_TRACK} />
          </View>
          <Text variant="small" color={ON_PASTEL_MUTED} style={{ marginTop: 4 }}>
            {((data?.water ?? 0) / 1000).toFixed(1)} / {GOALS.waterMl / 1000} L water
          </Text>
        </Card>
        <Card index={2} tone="sage" style={styles.flex} onPress={go('/(tabs)/health/gym')} accessibilityLabel="Gym">
          <CardHead label="Gym" icon="dumbbell" tone="sage" />
          <CountUp value={data?.weekMin ?? 0} color={ON_PASTEL} />
          <Text variant="small" color={ON_PASTEL_MUTED}>
            active min this week
          </Text>
          <View style={{ marginTop: space.md }}>
            <Meter progress={(data?.weekMin ?? 0) / GOALS.workoutMinPerWeek} color={ON_PASTEL} track={PASTEL_TRACK} />
          </View>
          <Text variant="small" color={ON_PASTEL_MUTED} style={{ marginTop: 4 }}>
            {data?.weekSessions ?? 0} sessions · goal {GOALS.workoutMinPerWeek}
          </Text>
        </Card>
      </Row>

      <Row>
        <Card index={3} tone="blush" style={styles.flex} onPress={go('/(tabs)/health/grooming')} accessibilityLabel="Grooming">
          <CardHead label="Grooming" icon="hanger" tone="blush" />
          <CountUp value={data?.routines ?? 0} color={ON_PASTEL} />
          <Text variant="small" color={ON_PASTEL_MUTED}>
            active routines · wardrobe
          </Text>
        </Card>
        <Card index={4} tone="butter" style={styles.flex} onPress={go('/(tabs)/health/review')} accessibilityLabel="Monthly review">
          <CardHead label="Review" icon="calendar-month-outline" tone="butter" />
          <Text variant="num" color={ON_PASTEL}>
            {new Date().toLocaleDateString('en-US', { month: 'short' })}
          </Text>
          <Text variant="small" color={ON_PASTEL_MUTED}>
            day-by-day history
          </Text>
        </Card>
      </Row>

      <Card index={5} tone="ink" onPress={go('/(tabs)/brain/insights')} accessibilityLabel="AI insights">
        <CardHead label="Insights" icon="creation" tone="ink" />
        <Text variant="h2" color={c.onInk}>
          What your trends say
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  split: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});
