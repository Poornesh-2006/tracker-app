import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  HelperText,
  Modal,
  Portal,
  ProgressBar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { MonthCalendar } from '@/components/MonthCalendar';
import { GlassCard } from '@/components/GlassCard';
import { EmptyState } from '@/components/EmptyState';
import { DateField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import { MEAL_TYPES } from '@/constants/metrics';
import { useDataStore } from '@/stores/data';
import { addFoodLog, deleteFoodLog, updateFoodLog } from '@/services/meal-service';
import { addHydration, deleteHydration, listHydrationByDate, totalHydrationMl } from '@/services/hydration-service';
import { palette, radii } from '@/constants/theme';
import type { FoodLogEntry, FoodLogInput, HydrationEntry, MealType } from '@/types';
import { formatDate, todayStr } from '@/utils/dates';

const WATER_TARGET_ML = 3000;
const QUICK_ML = [250, 500, 750];

export default function FuelScreen() {
  const theme = useTheme();
  const foodDate = useDataStore((s) => s.foodDate);
  const foodByDate = useDataStore((s) => s.foodByDate);
  const caloriesByDate = useDataStore((s) => s.caloriesByDate);
  const setFoodDate = useDataStore((s) => s.setFoodDate);
  const loadFood = useDataStore((s) => s.loadFood);

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<FoodLogEntry | null>(null);
  const [hydration, setHydration] = useState<HydrationEntry[]>([]);
  const [waterTotal, setWaterTotal] = useState(0);

  const reloadHydration = useCallback(async (date: string) => {
    const [list, total] = await Promise.all([listHydrationByDate(date), totalHydrationMl(date)]);
    setHydration(list);
    setWaterTotal(total);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const d = todayStr();
      loadFood(d);
      reloadHydration(d);
    }, [loadFood, reloadHydration]),
  );

  const onDateChange = async (d: string) => {
    await setFoodDate(d);
    await reloadHydration(d);
  };

  const meals = foodByDate[foodDate] ?? [];
  const calories = caloriesByDate[foodDate] ?? 0;
  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;
  const waterProgress = Math.min(1, waterTotal / WATER_TARGET_ML);

  const addWater = async (ml: number) => {
    await addHydration(foodDate, ml);
    await reloadHydration(foodDate);
  };

  const removeMeal = async (id: number) => {
    await deleteFoodLog(id);
    await loadFood(foodDate);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <MonthCalendar
          value={foodDate}
          onChange={onDateChange}
          maximumDate={new Date()}
          markedDates={Object.keys(foodByDate).filter((d) => (foodByDate[d]?.length ?? 0) > 0)}
        />

        <GlassCard style={styles.block} contentStyle={styles.blockPad}>
          <Text style={[styles.blockTitle, { color: ink }]}>Hydration</Text>
          <Text style={[styles.waterBig, { color: ink }]}>
            {waterTotal}
            <Text style={[styles.waterUnit, { color: muted }]}> / {WATER_TARGET_ML} ml</Text>
          </Text>
          <ProgressBar progress={waterProgress} color={palette.vermillion} style={styles.bar} />
          <View style={styles.quickRow}>
            {QUICK_ML.map((ml) => (
              <Button
                key={ml}
                mode="outlined"
                compact
                onPress={() => addWater(ml)}
                textColor={ink}
                style={styles.quickBtn}>
                +{ml}ml
              </Button>
            ))}
          </View>
          {hydration.slice(0, 3).map((h) => (
            <View key={h.id} style={styles.hydroRow}>
              <Text style={{ color: muted }}>{h.amountMl} ml</Text>
              <MaterialCommunityIcons
                name="close"
                size={16}
                color={muted}
                onPress={async () => {
                  await deleteHydration(h.id);
                  await reloadHydration(foodDate);
                }}
              />
            </View>
          ))}
        </GlassCard>

        <View style={styles.headerRow}>
          <Text style={[styles.blockTitle, { color: ink }]}>Food log</Text>
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
            Add meal
          </Button>
        </View>

        <GlassCard contentStyle={styles.blockPad}>
          <Text style={{ color: muted }}>{formatDate(foodDate)}</Text>
          <Text style={[styles.calBig, { color: ink }]}>
            {calories}
            <Text style={[styles.waterUnit, { color: muted }]}> kcal</Text>
          </Text>
        </GlassCard>

        {meals.length === 0 ? (
          <EmptyState icon="food-apple-outline" title="No meals" message="Log what you eat today." />
        ) : (
          <View style={styles.list}>
            {meals.map((m) => (
              <GlassCard key={m.id} contentStyle={styles.mealRow}>
                {m.photoUri ? (
                  <Image source={{ uri: m.photoUri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <MaterialCommunityIcons name="food" size={18} color={muted} />
                  </View>
                )}
                <View style={{ flex: 1 }} onTouchEnd={() => { setEditing(m); setShowAdd(true); }}>
                  <Text style={{ color: ink, fontWeight: '700' }}>{m.name}</Text>
                  <Text style={{ color: muted, fontSize: 12 }}>
                    {m.mealType}
                    {m.calories != null ? ` · ${m.calories} kcal` : ''}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color={muted}
                  onPress={() => removeMeal(m.id)}
                />
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>

      <Portal>
        <AddMealModal
          visible={showAdd}
          initial={editing}
          defaultDate={foodDate}
          onDismiss={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setShowAdd(false);
            setEditing(null);
            await loadFood(foodDate);
          }}
        />
      </Portal>
    </View>
  );
}

function AddMealModal({
  visible,
  initial,
  defaultDate,
  onDismiss,
  onSaved,
}: {
  visible: boolean;
  initial: FoodLogEntry | null;
  defaultDate: string;
  onDismiss: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [date, setDate] = useState(defaultDate);
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setDate(initial.date);
      setMealType(initial.mealType);
      setName(initial.name);
      setCalories(initial.calories != null ? String(initial.calories) : '');
      setProtein(initial.protein != null ? String(initial.protein) : '');
      setCarbs(initial.carbs != null ? String(initial.carbs) : '');
      setFat(initial.fat != null ? String(initial.fat) : '');
      setPhotoUri(initial.photoUri);
    } else {
      setDate(defaultDate);
      setMealType('breakfast');
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setPhotoUri(null);
    }
    setError('');
  }, [visible, initial, defaultDate]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const save = async () => {
    if (!name.trim()) {
      setError('Enter a meal name');
      return;
    }
    setBusy(true);
    const input: FoodLogInput = {
      date,
      mealType,
      name: name.trim(),
      calories: calories ? Number(calories) : null,
      protein: protein ? Number(protein) : null,
      carbs: carbs ? Number(carbs) : null,
      fat: fat ? Number(fat) : null,
      photoUri,
    };
    if (initial) await updateFoodLog(initial.id, input);
    else await addFoodLog(input);
    setBusy(false);
    onSaved();
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text style={{ fontWeight: '800', fontSize: 18 }}>{initial ? 'Edit meal' : 'Add meal'}</Text>
      <DateField value={date} onChange={setDate} maximumDate={new Date()} />
      <View style={styles.chips}>
        {MEAL_TYPES.map((t) => (
          <Chip key={t.value} selected={t.value === mealType} onPress={() => setMealType(t.value as MealType)} showSelectedCheck={false}>
            {t.label}
          </Chip>
        ))}
      </View>
      <TextInput mode="outlined" label="Meal" value={name} onChangeText={setName} style={{ marginTop: 8 }} />
      <NumberField label="Calories" value={calories} onChange={setCalories} />
      <NumberField label="Protein" value={protein} onChange={setProtein} decimal />
      <NumberField label="Carbs" value={carbs} onChange={setCarbs} decimal />
      <NumberField label="Fat" value={fat} onChange={setFat} decimal />
      <Button mode="outlined" icon="camera" onPress={pickPhoto} style={{ marginTop: 8 }}>
        Photo
      </Button>
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: 16, paddingBottom: 120 },
  block: { marginTop: 14 },
  blockPad: { paddingVertical: 14 },
  blockTitle: { fontSize: 16, fontWeight: '800' },
  waterBig: { fontSize: 32, fontWeight: '800', marginTop: 6 },
  waterUnit: { fontSize: 14, fontWeight: '500' },
  bar: { marginTop: 10, height: 8, borderRadius: 4, backgroundColor: 'rgba(204,197,185,0.35)' },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickBtn: { borderRadius: radii.pill, borderColor: palette.chromeWhite },
  hydroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  calBig: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  list: { gap: 8, marginTop: 10 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(204,197,185,0.35)' },
  modal: { margin: 20, borderRadius: radii.xl, padding: 18, maxHeight: '90%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
});
