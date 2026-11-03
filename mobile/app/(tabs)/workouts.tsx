import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  HelperText,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { DateField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import { INTENSITY_LABELS } from '@/constants/metrics';
import { WORKOUT_TYPES } from '@/constants/workout-calculations';
import { summarizeWorkoutsWeek } from '@/utils/calculations';
import { useDataStore } from '@/stores/data';
import { addWorkout, deleteWorkout, updateWorkout } from '@/services/workout-service';
import { GlassCard } from '@/components/GlassCard';
import { palette, radii } from '@/constants/theme';
import { validateNumber } from '@/utils/validators';
import type { WorkoutEntry, WorkoutInput } from '@/types';
import { formatDate, todayStr } from '@/utils/dates';

export default function WorkoutsScreen() {
  const theme = useTheme();
  const workouts = useDataStore((s) => s.workouts);
  const reloadWorkouts = useDataStore((s) => s.reloadWorkouts);

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<WorkoutEntry | null>(null);

  useFocusEffect(
    useCallback(() => {
      reloadWorkouts();
    }, [reloadWorkouts]),
  );

  const week = useMemo(() => summarizeWorkoutsWeek(workouts), [workouts]);

  const remove = async (id: number) => {
    await deleteWorkout(id);
    await reloadWorkouts();
  };

  return (
    <Screen
      title="Workouts"
      subtitle="Training log"
      action={
        <Button
          mode="contained"
          compact
          buttonColor={palette.vermillion}
          textColor="#fff"
          style={{ borderRadius: radii.pill }}
          onPress={() => {
            setEditing(null);
            setShowAdd(true);
          }}>
          Log workout
        </Button>
      }>
      <GlassCard style={styles.summary} contentStyle={styles.summaryContent}>
        <Text style={[styles.summaryTitle, { color: theme.colors.onSurface }]}>This week</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{week.count}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>sessions</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{week.durationMin}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>minutes</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{week.calories}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>kcal</Text>
          </View>
        </View>
      </GlassCard>

      {workouts.length === 0 ? (
        <EmptyState
          icon="dumbbell"
          title="No workouts yet"
          message="Log a session and track your training progression over time."
        />
      ) : (
        <View style={styles.list}>
          {workouts.map((w) => (
            <Card
              key={w.id}
              style={[styles.item, { backgroundColor: theme.colors.surface }]}
              onPress={() => {
                setEditing(w);
                setShowAdd(true);
              }}>
              <Card.Content style={styles.itemContent}>
                <View style={[styles.itemIcon, { backgroundColor: theme.colors.primary + '22' }]}>
                  <MaterialCommunityIcons name="dumbbell" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.itemText}>
                  <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
                    {w.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatDate(w.date)}
                    {w.durationMin != null ? ` · ${w.durationMin} min` : ''}
                    {w.intensity != null ? ` · ${INTENSITY_LABELS[w.intensity] ?? w.intensity}` : ''}
                    {w.calories != null ? ` · ${w.calories} kcal` : ''}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                  onPress={() => remove(w.id)}
                />
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      <Portal>
        <AddWorkoutModal
          visible={showAdd}
          initial={editing}
          onDismiss={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowAdd(false);
            setEditing(null);
            reloadWorkouts();
          }}
        />
      </Portal>
    </Screen>
  );
}

interface AddWorkoutModalProps {
  visible: boolean;
  initial: WorkoutEntry | null;
  onDismiss: () => void;
  onSaved: () => void;
}

const INTENSITIES = [1, 2, 3, 4, 5];

function AddWorkoutModal({ visible, initial, onDismiss, onSaved }: AddWorkoutModalProps) {
  const theme = useTheme();
  const [date, setDate] = useState(todayStr());
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState<number | null>(null);
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initial) {
        setDate(initial.date);
        setName(initial.name);
        setDuration(initial.durationMin != null ? String(initial.durationMin) : '');
        setIntensity(initial.intensity);
        setCalories(initial.calories != null ? String(initial.calories) : '');
        setNotes(initial.notes ?? '');
      } else {
        setDate(todayStr());
        setName('');
        setDuration('');
        setIntensity(null);
        setCalories('');
        setNotes('');
      }
      setError('');
    }
  }, [visible, initial]);

  const save = async () => {
    if (!name.trim()) {
      setError('Enter an activity name.');
      return;
    }
    const durationValue = duration ? Number(duration) : null;
    const caloriesValue = calories ? Number(calories) : null;
    const durationValidation = validateNumber('durationMin', durationValue);
    const caloriesValidation = validateNumber('calories', caloriesValue);
    if (!durationValidation.valid) {
      setError(durationValidation.error ?? 'Invalid duration.');
      return;
    }
    if (!caloriesValidation.valid) {
      setError(caloriesValidation.error ?? 'Invalid calories.');
      return;
    }
    setBusy(true);
    const input: WorkoutInput = {
      date,
      name: name.trim(),
      durationMin: durationValue,
      intensity,
      calories: caloriesValue,
      notes: notes || null,
    };
    if (initial) {
      await updateWorkout(initial.id, input);
    } else {
      await addWorkout(input);
    }
    setBusy(false);
    onSaved();
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {initial ? 'Edit workout' : 'Log workout'}
      </Text>
      <DateField value={date} onChange={setDate} maximumDate={new Date()} />

      <Text variant="labelMedium" style={styles.fieldLabel}>
        Activity type
      </Text>
      <View style={styles.chips}>
        {WORKOUT_TYPES.map((t) => {
          const active = name === t;
          return (
            <Chip key={t} selected={active} onPress={() => setName(t)} showSelectedCheck={false}>
              {t}
            </Chip>
          );
        })}
      </View>

      <TextInput
        mode="outlined"
        label="Activity name"
        value={name}
        onChangeText={setName}
        style={styles.field}
      />

      <View style={styles.macroGrid}>
        <NumberField label="Duration (min)" value={duration} onChange={setDuration} />
        <NumberField label="Calories" value={calories} onChange={setCalories} />
      </View>

      <Text variant="labelMedium" style={styles.fieldLabel}>
        Intensity
      </Text>
      <View style={styles.chips}>
        {INTENSITIES.map((i) => {
          const active = intensity === i;
          return (
            <Chip key={i} selected={active} onPress={() => setIntensity(i)} showSelectedCheck={false}>
              {INTENSITY_LABELS[i]}
            </Chip>
          );
        })}
      </View>

      <TextInput
        mode="outlined"
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={styles.field}
      />

      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>

      <View style={styles.modalActions}>
        <Button mode="text" onPress={onDismiss}>
          Cancel
        </Button>
        <Button mode="contained" onPress={save} loading={busy} disabled={busy || !name.trim()}>
          {initial ? 'Update' : 'Save'}
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  summary: { marginTop: 4 },
  summaryContent: { paddingVertical: 14 },
  summaryTitle: { fontSize: 16, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  summaryCell: { alignItems: 'center' },
  summaryValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  list: { gap: 8, marginTop: 12 },
  item: { borderRadius: radii.lg, elevation: 0, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.chromeWhite },
  itemContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemText: { flex: 1 },
  modal: { margin: 24, borderRadius: radii.xl, padding: 20, maxHeight: '88%' },
  field: { marginTop: 10 },
  fieldLabel: { marginTop: 12, marginBottom: 4, opacity: 0.8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 },
});
