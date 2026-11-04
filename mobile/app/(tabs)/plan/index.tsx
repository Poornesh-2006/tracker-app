import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { router, type Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Empty, IconButton, ListItem, MonthGrid, Row, Screen, Section, Segmented, Tap, Text, addDot, enter, monthOf } from '@/components/ui';
import { TaskSheet } from '@/components/forms/EntrySheets';
import { StreakWidget } from '@/components/widgets/StreakWidget';
import { loadStreak } from '@/services/streak-service';
import { accent, pastel, radii, space, useTheme } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { askDelete, attempt } from '@/components/forms/actions';
import { deleteTodo, listTodos, setTodoDone } from '@/services/todo-service';
import { listTripDates, listTripsByDate } from '@/services/travel-service';
import type { TodoItem } from '@/types';
import { formatDate, todayStr } from '@/utils/dates';

type Mode = 'day' | 'tasks';
const VIEWS = [
  { value: 'day' as Mode, label: 'Day' },
  { value: 'tasks' as Mode, label: 'All tasks' },
];

async function loadPlan(day: string) {
  const [todos, tripDates, trips] = await Promise.all([listTodos(), listTripDates(), listTripsByDate(day)]);
  return { todos, tripDates, trips };
}

/** Group open tasks the way people think about them. */
function bucket(t: TodoItem, today: string): string {
  if (!t.dueDate) return 'Someday';
  if (t.dueDate < today) return 'Overdue';
  if (t.dueDate === today) return 'Today';
  return 'Upcoming';
}
const BUCKETS = ['Overdue', 'Today', 'Upcoming', 'Someday'];

export default function PlanScreen() {
  const { c } = useTheme();
  const today = todayStr();
  const [month, setMonth] = useState(monthOf(today));
  const [day, setDay] = useState(today);
  const [view, setView] = useState<Mode>('day');
  const [taskOpen, setTaskOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const { data } = useFocusData(useCallback(() => loadPlan(day), [day]));
  const { data: streak } = useFocusData(useCallback(loadStreak, []));

  const dots = useMemo(() => {
    const out: Record<string, string[]> = {};
    data?.todos.forEach((t) => t.dueDate && !t.done && addDot(out, t.dueDate, pastel.butter));
    data?.tripDates.forEach((d) => addDot(out, d, accent.tangerine));
    return out;
  }, [data]);

  const toggle = (t: TodoItem) => attempt(() => setTodoDone(t.id, !t.done), 'Could not update the task.');
  const remove = (t: TodoItem) => askDelete(`"${t.title}"`, () => deleteTodo(t.id));

  const open = data?.todos.filter((t) => !t.done) ?? [];
  const done = data?.todos.filter((t) => t.done) ?? [];
  const dayTasks = data?.todos.filter((t) => t.dueDate === day) ?? [];

  const task = (t: TodoItem, i: number) => (
    <Animated.View key={t.id} entering={enter(i)} layout={LinearTransition}>
      <View style={[styles.task, { backgroundColor: c.surface }]}>
        <Tap onPress={() => void toggle(t)} scaleTo={0.8} accessibilityRole="checkbox" accessibilityState={{ checked: t.done }} accessibilityLabel={t.title} style={[styles.check, { borderColor: c.ink, backgroundColor: t.done ? c.ink : 'transparent' }]}>
          {t.done ? <MaterialCommunityIcons name="check" size={16} color={c.onInk} /> : null}
        </Tap>
        <Tap onLongPress={() => remove(t)} longPressLabel="Delete" haptics={false} scaleTo={1} style={styles.flex} accessibilityLabel={t.title} accessibilityHint="Long-press to delete">
          <Text variant="title" numberOfLines={2} style={t.done && { textDecorationLine: 'line-through', opacity: 0.45 }}>
            {t.title}
          </Text>
          <Text variant="small" muted>
            {[t.category !== 'general' && t.category, t.dueDate && t.dueDate !== day && formatDate(t.dueDate)].filter(Boolean).join(' · ') || ' '}
          </Text>
        </Tap>
      </View>
    </Animated.View>
  );

  return (
    <Screen eyebrow="Plan" title="Your days." right={<IconButton icon="plus" tone="ink" label="New task" onPress={() => setTaskOpen(true)} />}>
      <Segmented options={VIEWS} value={view} onChange={setView} />

      {view === 'day' ? (
        <>
          {streak ? <StreakWidget streak={streak.streak} week={streak.week} steps={streak.steps} goal={streak.goal} index={0} onPress={() => router.push('/(tabs)/me' as Href)} /> : null}
          <Card index={1}>
            <MonthGrid month={month} onMonthChange={setMonth} selected={day} onSelect={setDay} dots={dots} />
          </Card>
          <Section title={day === today ? 'Today' : formatDate(day)} />
          <Row>
            <Button label="Task" icon="plus" small kind="ghost" onPress={() => setTaskOpen(true)} style={styles.flex} />
            <Button label="Trip" icon="subway-variant" small kind="ghost" onPress={() => router.push({ pathname: '/(tabs)/plan/new-trip', params: { date: day } } as unknown as Href)} style={styles.flex} />
          </Row>
          {data?.trips.map((trip, i) => (
            <ListItem
              key={trip.id}
              index={i}
              icon="subway-variant"
              iconTone="sky"
              title={trip.title}
              subtitle={[trip.status, trip.durationMin && `${trip.durationMin} min`, trip.totalPrice != null && `₹${trip.totalPrice}`].filter(Boolean).join(' · ')}
              chevron
              onPress={() => router.push({ pathname: '/(tabs)/plan/trip', params: { id: String(trip.id) } } as unknown as Href)}
            />
          ))}
          <View style={{ gap: space.sm }}>{dayTasks.map(task)}</View>
          {data && !dayTasks.length && !data.trips.length ? <Empty icon="calendar-check-outline" title="Free day" body="No tasks or trips planned." /> : null}
        </>
      ) : (
        <>
          {BUCKETS.map((b) => {
            const items = open.filter((t) => bucket(t, today) === b);
            if (!items.length) return null;
            return (
              <View key={b} style={{ gap: space.sm }}>
                <Section title={b} right={<Text muted>{items.length}</Text>} />
                {items.map(task)}
              </View>
            );
          })}
          {data && !open.length ? <Empty icon="party-popper" title="All clear" body="Nothing open. Enjoy it." /> : null}
          {done.length ? (
            <>
              <Button label={showDone ? 'Hide completed' : `Show completed (${done.length})`} kind="ghost" small onPress={() => setShowDone((s) => !s)} />
              {showDone ? <View style={{ gap: space.sm }}>{done.map(task)}</View> : null}
            </>
          ) : null}
          {open.length || done.length ? (
            <Text variant="small" muted center>
              Long-press a task to delete it.
            </Text>
          ) : null}
        </>
      )}

      <TaskSheet open={taskOpen} date={view === 'day' ? day : undefined} onClose={() => setTaskOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  task: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radii.lg, minHeight: 60 },
  check: { width: 28, height: 28, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
