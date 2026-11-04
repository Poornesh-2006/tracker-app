import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card, CardHead, Empty, ListItem, MonthGrid, Row, Screen, Text, addDot, monthOf } from '@/components/ui';
import { MetricsSheet } from '@/components/forms/EntrySheets';
import { accent, pastel, space } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { listDailyMetricsBetween } from '@/services/metrics-service';
import { listFoodBetween } from '@/services/meal-service';
import { listWorkoutsBetween } from '@/services/workout-service';
import { formatDate, todayStr } from '@/utils/dates';

async function loadMonth(month: string) {
  const from = `${month}-01`;
  const to = `${month}-31`;
  const [metrics, food, workouts] = await Promise.all([listDailyMetricsBetween(from, to), listFoodBetween(from, to), listWorkoutsBetween(from, to)]);
  return { metrics, food, workouts };
}

/** Month at a glance: dots for check-ins (pink), meals (peach), workouts (orange); tap a day for details. */
export default function ReviewScreen() {
  const [month, setMonth] = useState(monthOf(todayStr()));
  const [day, setDay] = useState(todayStr());
  const [edit, setEdit] = useState(false);
  const { data } = useFocusData(useCallback(() => loadMonth(month), [month]));

  const dots = useMemo(() => {
    const out: Record<string, string[]> = {};
    data?.metrics.forEach((m) => addDot(out, m.date, pastel.blush));
    data?.food.forEach((f) => addDot(out, f.date, pastel.peach));
    data?.workouts.forEach((w) => addDot(out, w.date, accent.tangerine));
    return out;
  }, [data]);

  const m = data?.metrics.find((x) => x.date === day) ?? null;
  const meals = data?.food.filter((f) => f.date === day) ?? [];
  const workouts = data?.workouts.filter((w) => w.date === day) ?? [];
  const kcal = meals.reduce((s, f) => s + (f.calories ?? 0), 0);

  return (
    <Screen back eyebrow="Health" title="Review">
      <Card index={0}>
        <MonthGrid month={month} onMonthChange={setMonth} selected={day} onSelect={setDay} dots={dots} />
      </Card>

      <Text variant="h2">{formatDate(day)}</Text>
      <Card index={1} tone="blush" onPress={day <= todayStr() ? () => setEdit(true) : undefined}>
        <CardHead label="Check-in" icon="heart-pulse" tone="blush" />
        {m ? (
          <Row gap={space.lg}>
            <Stat label="Steps" value={m.steps?.toLocaleString() ?? '–'} />
            <Stat label="Sleep" value={m.sleepHours != null ? `${m.sleepHours}h` : '–'} />
            <Stat label="HR" value={m.heartRate?.toString() ?? '–'} />
            <Stat label="Stress" value={m.stress != null ? `${m.stress}/10` : '–'} />
          </Row>
        ) : (
          <Text variant="small" muted>
            {day <= todayStr() ? 'Nothing logged. Tap to fill it in.' : 'Future day.'}
          </Text>
        )}
        {m?.notes ? (
          <Text variant="small" muted style={{ marginTop: space.sm }}>
            {m.notes}
          </Text>
        ) : null}
      </Card>

      <View style={{ gap: space.sm }}>
        {meals.length ? <ListItem icon="food-apple-outline" iconTone="peach" title={`${meals.length} meal${meals.length > 1 ? 's' : ''}`} subtitle={meals.map((f) => f.name).join(', ')} value={`${kcal} kcal`} /> : null}
        {workouts.map((w) => (
          <ListItem key={w.id} icon="dumbbell" iconTone="sage" title={w.name} subtitle={w.durationMin ? `${w.durationMin} min` : null} value={w.calories != null ? `${w.calories} kcal` : undefined} />
        ))}
        {data && !m && !meals.length && !workouts.length ? <Empty icon="calendar-blank-outline" title="A quiet day" body="No meals or workouts logged." /> : null}
      </View>

      <MetricsSheet open={edit} date={day} onClose={() => setEdit(false)} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="title">
        {value}
      </Text>
      <Text variant="small" muted>
        {label}
      </Text>
    </View>
  );
}
