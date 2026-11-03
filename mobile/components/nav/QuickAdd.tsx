import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { pastel, radii, space, ON_PASTEL, ON_PASTEL_MUTED } from '@/constants/theme';
import { Sheet, Tap, Text, enter, type IconName } from '@/components/ui';
import { BloodTestSheet, MealSheet, MetricsSheet, TaskSheet, WorkoutSheet } from '@/components/forms/EntrySheets';
import { logWater } from '@/components/forms/actions';
import { todayStr } from '@/utils/dates';

type FormKind = 'meal' | 'workout' | 'metrics' | 'blood' | 'task';

const ACTIONS: { key: FormKind | 'water250' | 'water500'; label: string; hint: string; icon: IconName; tone: keyof typeof pastel }[] = [
  { key: 'meal', label: 'Meal', hint: 'Food & macros', icon: 'food-apple-outline', tone: 'peach' },
  { key: 'workout', label: 'Workout', hint: 'Gym, run, yoga', icon: 'dumbbell', tone: 'sage' },
  { key: 'water250', label: '+250 ml', hint: 'One glass', icon: 'cup-water', tone: 'sky' },
  { key: 'water500', label: '+500 ml', hint: 'A bottle', icon: 'bottle-soda-outline', tone: 'sky' },
  { key: 'metrics', label: 'Check-in', hint: 'Sleep, steps, HR', icon: 'heart-pulse', tone: 'blush' },
  { key: 'blood', label: 'Lab result', hint: 'Encrypted', icon: 'test-tube', tone: 'lavender' },
  { key: 'task', label: 'Task', hint: 'To-do', icon: 'checkbox-marked-circle-outline', tone: 'butter' },
];

/** The + sheet: one tap for water, otherwise hands off to the matching form sheet. */
export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<FormKind | null>(null);
  const pending = useRef<FormKind | null>(null);

  // Open the form only after the quick-add sheet has animated away (two modals can't stack cleanly).
  useEffect(() => {
    if (open || !pending.current) return;
    const next = pending.current;
    pending.current = null;
    const t = setTimeout(() => setForm(next), 260);
    return () => clearTimeout(t);
  }, [open]);

  const pick = async (key: (typeof ACTIONS)[number]['key']) => {
    if (key === 'water250' || key === 'water500') {
      onClose();
      await logWater(todayStr(), key === 'water250' ? 250 : 500);
      return;
    }
    pending.current = key;
    onClose();
  };

  const closeForm = () => setForm(null);

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Quick add" subtitle="What are you logging?">
        <View style={styles.grid}>
          {ACTIONS.map((a, i) => (
            <Animated.View key={a.key} entering={open ? enter(i) : undefined} style={styles.cell}>
              <Tap onPress={() => void pick(a.key)} style={[styles.tile, { backgroundColor: pastel[a.tone] }]} accessibilityLabel={`${a.label}, ${a.hint}`}>
                <MaterialCommunityIcons name={a.icon} size={26} color={ON_PASTEL} />
                <View>
                  <Text variant="title" color={ON_PASTEL}>
                    {a.label}
                  </Text>
                  <Text variant="small" color={ON_PASTEL_MUTED}>
                    {a.hint}
                  </Text>
                </View>
              </Tap>
            </Animated.View>
          ))}
        </View>
      </Sheet>
      <MealSheet open={form === 'meal'} onClose={closeForm} />
      <WorkoutSheet open={form === 'workout'} onClose={closeForm} />
      <MetricsSheet open={form === 'metrics'} onClose={closeForm} />
      <BloodTestSheet open={form === 'blood'} onClose={closeForm} />
      <TaskSheet open={form === 'task'} onClose={closeForm} />
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { width: '47.5%' },
  tile: { borderRadius: radii.lg, padding: space.lg, minHeight: 116, justifyContent: 'space-between' },
});
