import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Chips, DateField, Field, NumberField, parseNum, Scale, Segmented, Sheet, Text, toast } from '@/components/ui';
import { MEAL_TYPES, TEST_TYPES, getTestTypeDef } from '@/constants/metrics';
import { WORKOUT_TYPES, calculateWorkoutCalories } from '@/constants/workout-calculations';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { ErrorText, FormFooter, PhotoField } from './FormParts';
import { bumpData } from '@/hooks/useDataVersion';
import { addFoodLog, deleteFoodLog, updateFoodLog } from '@/services/meal-service';
import { addWorkout, deleteWorkout, updateWorkout } from '@/services/workout-service';
import { getDailyMetrics, upsertDailyMetrics } from '@/services/metrics-service';
import { addBloodTest, deleteBloodTest, updateBloodTest } from '@/services/blood-test-service';
import { addTodo } from '@/services/todo-service';
import type { BloodTest, FoodLogEntry, MealType, WorkoutEntry } from '@/types';
import { confirmDestructive } from '@/utils/confirm';
import { todayStr } from '@/utils/dates';
import { validateNumber, type ValidationKey } from '@/utils/validators';

interface BaseProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful save/delete so the screen can reload. */
  onSaved?: () => void;
  date?: string;
}

/** First failing rule among the given fields, or null. */
function firstError(fields: [ValidationKey, number | null][]): string | null {
  for (const [key, v] of fields) {
    const r = validateNumber(key, v);
    if (!r.valid) return r.error ?? 'Invalid value.';
  }
  return null;
}

/** After any save/delete: refresh every visible screen, then the caller. */
function saved(onSaved?: () => void) {
  bumpData();
  onSaved?.();
}

const str = (n: number | null | undefined) => (n == null ? '' : String(n));

/* ------------------------------------------------------------------ Meal */

export function MealSheet({ open, onClose, onSaved, date, entry }: BaseProps & { entry?: FoodLogEntry | null }) {
  const [form, setForm] = useState({ date: todayStr(), mealType: 'lunch' as MealType, name: '', calories: '', protein: '', carbs: '', fat: '' });
  const { busy, error, setError, run } = useAsyncAction();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      entry
        ? { date: entry.date, mealType: entry.mealType, name: entry.name, calories: str(entry.calories), protein: str(entry.protein), carbs: str(entry.carbs), fat: str(entry.fat) }
        : { date: date ?? todayStr(), mealType: guessMeal(), name: '', calories: '', protein: '', carbs: '', fat: '' },
    );
  }, [open, entry, date, setError]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () =>
    run(async () => {
      const nums = { calories: parseNum(form.calories), protein: parseNum(form.protein), carbs: parseNum(form.carbs), fat: parseNum(form.fat) };
      if (!form.name.trim()) throw new Error('Give the meal a name.');
      const bad = firstError([['calories', nums.calories], ['protein', nums.protein], ['carbs', nums.carbs], ['fat', nums.fat]]);
      if (bad) throw new Error(bad);
      const input = { date: form.date, mealType: form.mealType, name: form.name.trim(), ...nums };
      if (entry) await updateFoodLog(entry.id, input);
      else await addFoodLog(input);
      toast(entry ? 'Meal updated' : 'Meal logged', 'food-apple');
      saved(onSaved);
      onClose();
    });

  const remove = () =>
    entry &&
    confirmDestructive('Delete meal?', `"${entry.name}" will be removed.`, () =>
      run(async () => {
        await deleteFoodLog(entry.id);
        toast('Meal deleted', 'delete');
        saved(onSaved);
        onClose();
      }),
    );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={entry ? 'Edit meal' : 'Log a meal'}
      footer={<FormFooter editing={!!entry} saveLabel="Log meal" icon="check" onSave={save} onDelete={remove} busy={busy} />}>
      <Segmented options={MEAL_TYPES as { value: MealType; label: string }[]} value={form.mealType} onChange={(v) => setForm((f) => ({ ...f, mealType: v }))} />
      <Field label="What did you eat?" value={form.name} onChangeText={set('name')} placeholder="Paneer rice bowl" autoFocus={!entry} />
      <NumberField label="Calories" value={form.calories} onChangeText={set('calories')} suffix="kcal" integer />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <NumberField label="Protein" value={form.protein} onChangeText={set('protein')} suffix="g" />
        </View>
        <View style={{ flex: 1 }}>
          <NumberField label="Carbs" value={form.carbs} onChangeText={set('carbs')} suffix="g" />
        </View>
        <View style={{ flex: 1 }}>
          <NumberField label="Fat" value={form.fat} onChangeText={set('fat')} suffix="g" />
        </View>
      </View>
      <DateField label="Date" value={form.date} onChange={set('date')} />
      <ErrorText error={error} />
    </Sheet>
  );
}

function guessMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

/* --------------------------------------------------------------- Workout */

export function WorkoutSheet({ open, onClose, onSaved, date, entry }: BaseProps & { entry?: WorkoutEntry | null }) {
  const [form, setForm] = useState({ date: todayStr(), name: 'Running', duration: '30', intensity: 3 as number | null, calories: '', notes: '' });
  const { busy, error, setError, run } = useAsyncAction();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      entry
        ? { date: entry.date, name: entry.name, duration: str(entry.durationMin), intensity: entry.intensity, calories: str(entry.calories), notes: entry.notes ?? '' }
        : { date: date ?? todayStr(), name: 'Running', duration: '30', intensity: 3, calories: '', notes: '' },
    );
  }, [open, entry, date, setError]);

  const duration = parseNum(form.duration);
  const estimate = useMemo(
    () => (duration && duration > 0 ? calculateWorkoutCalories(form.name, duration, form.intensity) : null),
    [duration, form.name, form.intensity],
  );

  const save = () =>
    run(async () => {
      const calories = parseNum(form.calories);
      if (!form.name.trim()) throw new Error('Pick or type a workout.');
      const bad = firstError([['durationMin', duration], ['calories', calories]]);
      if (bad) throw new Error(bad);
      const input = { date: form.date, name: form.name.trim(), durationMin: duration, intensity: form.intensity, calories, notes: form.notes.trim() || null };
      if (entry) await updateWorkout(entry.id, input);
      else await addWorkout(input);
      toast(entry ? 'Workout updated' : 'Workout logged', 'dumbbell');
      saved(onSaved);
      onClose();
    });

  const remove = () =>
    entry &&
    confirmDestructive('Delete workout?', `"${entry.name}" will be removed.`, () =>
      run(async () => {
        await deleteWorkout(entry.id);
        toast('Workout deleted', 'delete');
        saved(onSaved);
        onClose();
      }),
    );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={entry ? 'Edit workout' : 'Log a workout'}
      subtitle={estimate ? `≈ ${estimate} kcal if you leave calories empty` : undefined}
      footer={<FormFooter editing={!!entry} saveLabel="Log workout" icon="check" onSave={save} onDelete={remove} busy={busy} />}>
      <Chips options={WORKOUT_TYPES.map((t) => ({ value: t, label: t }))} value={WORKOUT_TYPES.includes(form.name) ? form.name : null} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
      <Field label="Workout" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <NumberField label="Duration" value={form.duration} onChangeText={(v) => setForm((f) => ({ ...f, duration: v }))} suffix="min" integer />
        </View>
        <View style={{ flex: 1 }}>
          <NumberField label="Calories" value={form.calories} onChangeText={(v) => setForm((f) => ({ ...f, calories: v }))} suffix="kcal" placeholder={estimate ? String(estimate) : undefined} integer />
        </View>
      </View>
      <Scale label="Intensity" value={form.intensity} onChange={(v) => setForm((f) => ({ ...f, intensity: v }))} hint={['', 'Easy', 'Light', 'Moderate', 'Hard', 'All out'][form.intensity ?? 0]} />
      <DateField label="Date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
      <Field label="Notes" value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} multiline placeholder="PRs, how it felt…" />
      <ErrorText error={error} />
    </Sheet>
  );
}

/* --------------------------------------------------------------- Metrics */

/** Daily check-in. Prefills what's already logged for the day; empty fields keep stored values. */
export function MetricsSheet({ open, onClose, onSaved, date }: BaseProps) {
  const [day, setDay] = useState(todayStr());
  const [form, setForm] = useState({ steps: '', sleep: '', heartRate: '', weight: '', stress: null as number | null, notes: '' });
  const { busy, error, setError, run } = useAsyncAction();

  useEffect(() => {
    if (open) setDay(date ?? todayStr());
  }, [open, date]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    let alive = true;
    getDailyMetrics(day)
      .then((m) => {
        if (!alive) return;
        setForm({ steps: str(m?.steps), sleep: str(m?.sleepHours), heartRate: str(m?.heartRate), weight: str(m?.weight), stress: m?.stress ?? null, notes: m?.notes ?? '' });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [open, day, setError]);

  const set = (k: 'steps' | 'sleep' | 'heartRate' | 'weight' | 'notes') => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () =>
    run(async () => {
      const nums = { steps: parseNum(form.steps), sleepHours: parseNum(form.sleep), heartRate: parseNum(form.heartRate), weight: parseNum(form.weight) };
      const bad = firstError([['steps', nums.steps], ['sleepHours', nums.sleepHours], ['heartRate', nums.heartRate], ['weight', nums.weight], ['stress', form.stress]]);
      if (bad) throw new Error(bad);
      await upsertDailyMetrics({ date: day, ...nums, stress: form.stress, notes: form.notes.trim() || null });
      toast('Check-in saved', 'heart-pulse');
      saved(onSaved);
      onClose();
    });

  return (
    <Sheet open={open} onClose={onClose} title="Daily check-in" subtitle="Fill what you know — the rest stays as it was." footer={<Button label="Save check-in" icon="check" onPress={save} loading={busy} />}>
      <DateField label="Day" value={day} onChange={setDay} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <NumberField label="Steps" value={form.steps} onChangeText={set('steps')} integer />
        </View>
        <View style={{ flex: 1 }}>
          <NumberField label="Sleep" value={form.sleep} onChangeText={set('sleep')} suffix="h" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <NumberField label="Resting HR" value={form.heartRate} onChangeText={set('heartRate')} suffix="bpm" integer />
        </View>
        <View style={{ flex: 1 }}>
          <NumberField label="Weight" value={form.weight} onChangeText={set('weight')} suffix="kg" />
        </View>
      </View>
      <Scale label="Stress" max={10} value={form.stress} onChange={(v) => setForm((f) => ({ ...f, stress: v }))} hint={form.stress ? `${form.stress}/10` : 'not set'} />
      <Field label="Notes" value={form.notes} onChangeText={set('notes')} multiline placeholder="How did today feel?" />
      <ErrorText error={error} />
    </Sheet>
  );
}

/* ------------------------------------------------------------ Blood test */

export function BloodTestSheet({ open, onClose, onSaved, entry, presetType }: BaseProps & { entry?: BloodTest | null; presetType?: string }) {
  const [form, setForm] = useState({ date: todayStr(), testType: TEST_TYPES[0].label, value: '', unit: TEST_TYPES[0].unit, notes: '', custom: '', photoUri: null as string | null });
  const [query, setQuery] = useState('');
  const { busy, error, setError, run } = useAsyncAction();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setQuery('');
    if (entry) {
      const known = TEST_TYPES.some((t) => t.label === entry.testType);
      setForm({ date: entry.date, testType: known ? entry.testType : 'Custom', value: String(entry.value), unit: entry.unit, notes: entry.notes ?? '', custom: known ? '' : entry.testType, photoUri: entry.photoUri });
    } else {
      const def = presetType ? getTestTypeDef(presetType) : TEST_TYPES[0];
      setForm({ date: todayStr(), testType: def.label, value: '', unit: def.unit, notes: '', custom: '', photoUri: null });
    }
  }, [open, entry, presetType, setError]);

  const def = getTestTypeDef(form.testType);
  const shown = TEST_TYPES.filter((t) => t.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, query ? 12 : 8);

  const save = () =>
    run(async () => {
      const value = parseNum(form.value);
      if (value == null || !Number.isFinite(value)) throw new Error('Enter the result value.');
      const testType = form.testType === 'Custom' ? form.custom.trim() : form.testType;
      if (!testType) throw new Error('Name the custom test.');
      const input = { date: form.date, testType, value, unit: form.unit.trim(), notes: form.notes.trim() || null, photoUri: form.photoUri, source: form.photoUri ? ('photo' as const) : ('manual' as const) };
      if (entry) await updateBloodTest(entry.id, input);
      else await addBloodTest(input);
      toast(entry ? 'Result updated' : 'Result saved · encrypted', 'lock');
      saved(onSaved);
      onClose();
    });

  const remove = () =>
    entry &&
    confirmDestructive('Delete result?', `${entry.testType} on ${entry.date} will be removed.`, () =>
      run(async () => {
        await deleteBloodTest(entry.id);
        toast('Result deleted', 'delete');
        saved(onSaved);
        onClose();
      }),
    );

  const range = def.low != null || def.high != null ? `Normal ${def.low ?? '—'}–${def.high ?? '—'} ${def.unit}` : undefined;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={entry ? 'Edit result' : 'Add lab result'}
      subtitle="Values and notes are encrypted with your passcode."
      footer={<FormFooter editing={!!entry} saveLabel="Save result" icon="lock-outline" onSave={save} onDelete={remove} busy={busy} />}>
      <Field label="Find a test" value={query} onChangeText={setQuery} placeholder="Glucose, LDL, Vitamin D…" autoCapitalize="none" />
      <Chips
        options={shown.map((t) => ({ value: t.label, label: t.label }))}
        value={form.testType}
        onChange={(v) => setForm((f) => ({ ...f, testType: v, unit: getTestTypeDef(v).unit || f.unit }))}
      />
      {form.testType === 'Custom' ? <Field label="Test name" value={form.custom} onChangeText={(v) => setForm((f) => ({ ...f, custom: v }))} /> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 2 }}>
          <NumberField label={`${form.testType === 'Custom' ? 'Value' : form.testType}`} value={form.value} onChangeText={(v) => setForm((f) => ({ ...f, value: v }))} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Unit" value={form.unit} onChangeText={(v) => setForm((f) => ({ ...f, unit: v }))} autoCapitalize="none" />
        </View>
      </View>
      {range ? (
        <Text variant="small" muted>
          {range}
        </Text>
      ) : null}
      <DateField label="Test date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
      <Field label="Notes" value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} multiline placeholder="Lab, fasting, doctor's comments…" />
      <PhotoField uri={form.photoUri} onChange={(photoUri) => setForm((f) => ({ ...f, photoUri }))} label="report photo" camera />
      <ErrorText error={error} />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ Task */

export const TASK_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'health', label: 'Health' },
  { value: 'study', label: 'Study' },
  { value: 'work', label: 'Work' },
  { value: 'errand', label: 'Errand' },
] as const;

export function TaskSheet({ open, onClose, onSaved, date }: BaseProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [due, setDue] = useState<string | null>(null);
  const { busy, error, setError, run } = useAsyncAction();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle('');
    setCategory('general');
    setDue(date ?? null);
  }, [open, date, setError]);

  const save = () =>
    run(async () => {
      if (!title.trim()) throw new Error('What needs doing?');
      await addTodo(title.trim(), category, due);
      toast('Task added', 'checkbox-marked-circle-outline');
      saved(onSaved);
      onClose();
    });

  return (
    <Sheet open={open} onClose={onClose} title="New task" footer={<Button label="Add task" icon="plus" onPress={save} loading={busy} />}>
      <Field label="Task" value={title} onChangeText={setTitle} placeholder="Book dentist appointment" autoFocus onSubmit={save} />
      <Chips options={TASK_CATEGORIES} value={category} onChange={setCategory} />
      {due ? (
        <DateField label="Due" value={due} onChange={setDue} />
      ) : (
        <Button label="Add a due date" kind="ghost" icon="calendar-plus" small onPress={() => setDue(todayStr())} />
      )}
      <ErrorText error={error} />
    </Sheet>
  );
}
