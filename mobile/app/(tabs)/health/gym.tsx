import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
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

import { GlassCard } from '@/components/GlassCard';
import { EmptyState } from '@/components/EmptyState';
import { DateField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import { MetricsCard } from '@/components/MetricsCard';
import { INTENSITY_LABELS } from '@/constants/metrics';
import { WORKOUT_TYPES } from '@/constants/workout-calculations';
import { summarizeWorkoutsWeek } from '@/utils/calculations';
import { useDataStore } from '@/stores/data';
import { addWorkout, deleteWorkout, updateWorkout } from '@/services/workout-service';
import { upsertDailyMetrics } from '@/services/metrics-service';
import { calculateRecoveryScore } from '@/services/ai-engine';
import { palette, radii } from '@/constants/theme';
import type { DailyMetricsInput, WorkoutEntry, WorkoutInput } from '@/types';
import { formatDate, todayStr } from '@/utils/dates';

export default function GymScreen() {
  const theme = useTheme();
  const workouts = useDataStore((s) => s.workouts);
  const metrics = useDataStore((s) => s.metrics);
  const reloadWorkouts = useDataStore((s) => s.reloadWorkouts);
  const reloadMetrics = useDataStore((s) => s.reloadMetrics);
  const loadDashboard = useDataStore((s) => s.loadDashboard);

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<WorkoutEntry | null>(null);
  const [showActivity, setShowActivity] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      reloadWorkouts();
    }, [loadDashboard, reloadWorkouts]),
  );

  const week = useMemo(() => summarizeWorkoutsWeek(workouts), [workouts]);
  const latest = metrics.length ? metrics[metrics.length - 1] : null;
  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;

  const remove = async (id: number) => {
    await deleteWorkout(id);
    await reloadWorkouts();
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <GlassCard contentStyle={styles.weekPad}>
          <Text style={[styles.title, { color: ink }]}>This week</Text>
          <View style={styles.weekRow}>
            <Stat label="Sessions" value={String(week.count)} />
            <Stat label="Minutes" value={String(week.durationMin)} />
            <Stat label="kcal" value={String(week.calories)} />
          </View>
        </GlassCard>

        <Text style={[styles.title, { color: ink, marginTop: 16 }]}>Physical load</Text>
        <MetricsCard
          heartRate={latest?.heartRate}
          steps={latest?.steps}
          sleepHours={latest?.sleepHours}
          stress={latest?.stress}
        />
        <Button
          mode="outlined"
          style={styles.activityBtn}
          textColor={ink}
          onPress={() => setShowActivity(true)}>
          Log steps / sleep / sitting
        </Button>

        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: ink }]}>Workouts</Text>
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
        </View>

        {workouts.length === 0 ? (
          <EmptyState icon="dumbbell" title="No workouts" message="Log training, walks, or gym sessions." />
        ) : (
          <View style={styles.list}>
            {workouts.map((w) => (
              <GlassCard key={w.id} contentStyle={styles.item}>
                <View style={[styles.icon, { backgroundColor: palette.vermillion + '18' }]}>
                  <MaterialCommunityIcons name="dumbbell" size={18} color={palette.vermillion} />
                </View>
                <View style={{ flex: 1 }} onTouchEnd={() => { setEditing(w); setShowAdd(true); }}>
                  <Text style={{ color: ink, fontWeight: '700' }}>{w.name}</Text>
                  <Text style={{ color: muted, fontSize: 12 }}>
                    {formatDate(w.date)}
                    {w.durationMin != null ? ` · ${w.durationMin} min` : ''}
                    {w.intensity != null ? ` · ${INTENSITY_LABELS[w.intensity]}` : ''}
                  </Text>
                </View>
                <MaterialCommunityIcons name="delete-outline" size={20} color={muted} onPress={() => remove(w.id)} />
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>

      <Portal>
        <AddWorkoutModal
          visible={showAdd}
          initial={editing}
          onDismiss={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setShowAdd(false);
            setEditing(null);
            await reloadWorkouts();
          }}
        />
        <ActivityModal
          visible={showActivity}
          initial={latest}
          onDismiss={() => setShowActivity(false)}
          onSaved={async () => {
            setShowActivity(false);
            await reloadMetrics();
            await loadDashboard();
          }}
        />
      </Portal>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color: theme.colors.onSurface }}>{value}</Text>
      <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}

function AddWorkoutModal({
  visible,
  initial,
  onDismiss,
  onSaved,
}: {
  visible: boolean;
  initial: WorkoutEntry | null;
  onDismiss: () => void;
  onSaved: () => void;
}) {
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
    if (!visible) return;
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
  }, [visible, initial]);

  const save = async () => {
    if (!name.trim()) {
      setError('Enter activity name');
      return;
    }
    setBusy(true);
    const input: WorkoutInput = {
      date,
      name: name.trim(),
      durationMin: duration ? Number(duration) : null,
      intensity,
      calories: calories ? Number(calories) : null,
      notes: notes || null,
    };
    if (initial) await updateWorkout(initial.id, input);
    else await addWorkout(input);
    setBusy(false);
    onSaved();
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text style={{ fontWeight: '800', fontSize: 18 }}>{initial ? 'Edit workout' : 'Log workout'}</Text>
      <DateField value={date} onChange={setDate} maximumDate={new Date()} />
      <View style={styles.chips}>
        {WORKOUT_TYPES.map((t) => (
          <Chip key={t} selected={name === t} onPress={() => setName(t)} showSelectedCheck={false}>
            {t}
          </Chip>
        ))}
      </View>
      <TextInput mode="outlined" label="Name" value={name} onChangeText={setName} style={{ marginTop: 8 }} />
      <NumberField label="Duration (min)" value={duration} onChange={setDuration} />
      <NumberField label="Calories" value={calories} onChange={setCalories} />
      <View style={styles.chips}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Chip key={i} selected={intensity === i} onPress={() => setIntensity(i)} showSelectedCheck={false}>
            {INTENSITY_LABELS[i]}
          </Chip>
        ))}
      </View>
      <TextInput mode="outlined" label="Notes" value={notes} onChangeText={setNotes} style={{ marginTop: 8 }} />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
      <View style={styles.modalActions}>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button mode="contained" buttonColor={palette.vermillion} textColor="#fff" loading={busy} onPress={save}>
          Save
        </Button>
      </View>
    </Modal>
  );
}

function ActivityModal({
  visible,
  initial,
  onDismiss,
  onSaved,
}: {
  visible: boolean;
  initial: { date: string; steps: number | null; sleepHours: number | null; heartRate: number | null; stress: number | null; weight: number | null; notes: string | null } | null;
  onDismiss: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [date, setDate] = useState(todayStr());
  const [steps, setSteps] = useState('');
  const [sleep, setSleep] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [stress, setStress] = useState('');
  const [sitting, setSitting] = useState('');
  const [standing, setStanding] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDate(initial?.date ?? todayStr());
    setSteps(initial?.steps != null ? String(initial.steps) : '');
    setSleep(initial?.sleepHours != null ? String(initial.sleepHours) : '');
    setHeartRate(initial?.heartRate != null ? String(initial.heartRate) : '');
    setStress(initial?.stress != null ? String(initial.stress) : '');
    setSitting('');
    setStanding('');
  }, [visible, initial]);

  const save = async () => {
    setBusy(true);
    const notesBits = [
      sitting ? `Sitting ${sitting}h` : null,
      standing ? `Standing ${standing}h` : null,
      initial?.notes,
    ].filter(Boolean);
    const input: DailyMetricsInput = {
      date,
      steps: steps ? Number(steps) : null,
      sleepHours: sleep ? Number(sleep) : null,
      heartRate: heartRate ? Number(heartRate) : null,
      stress: stress ? Number(stress) : null,
      recoveryScore: calculateRecoveryScore({
        sleepHours: sleep ? Number(sleep) : null,
        stress: stress ? Number(stress) : null,
        heartRate: heartRate ? Number(heartRate) : null,
      }),
      notes: notesBits.length ? notesBits.join(' · ') : null,
    };
    await upsertDailyMetrics(input);
    setBusy(false);
    onSaved();
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text style={{ fontWeight: '800', fontSize: 18 }}>Daily activity</Text>
      <DateField value={date} onChange={setDate} maximumDate={new Date()} />
      <NumberField label="Steps" value={steps} onChange={setSteps} />
      <NumberField label="Sleep (hours)" value={sleep} onChange={setSleep} decimal />
      <NumberField label="Heart rate" value={heartRate} onChange={setHeartRate} />
      <NumberField label="Stress 1-10" value={stress} onChange={setStress} />
      <NumberField label="Sitting (hours)" value={sitting} onChange={setSitting} decimal />
      <NumberField label="Standing (hours)" value={standing} onChange={setStanding} decimal />
      <View style={styles.modalActions}>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button mode="contained" buttonColor={palette.vermillion} textColor="#fff" loading={busy} onPress={save}>
          Save
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: 16, paddingBottom: 120 },
  weekPad: { paddingVertical: 14 },
  title: { fontSize: 16, fontWeight: '800' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  activityBtn: { marginTop: 10, borderRadius: radii.pill, borderColor: palette.chromeWhite },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  list: { gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modal: { margin: 20, borderRadius: radii.xl, padding: 18, maxHeight: '90%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
});
