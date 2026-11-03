import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
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
import * as ImagePicker from 'expo-image-picker';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { MonthCalendar } from '@/components/MonthCalendar';
import { GlassCard } from '@/components/GlassCard';
import { WeeklyFoodSummary } from '@/components/WeeklyFoodSummary';
import { DateField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import { MEAL_TYPES } from '@/constants/metrics';
import { useDataStore } from '@/stores/data';
import { addFoodLog, deleteFoodLog, updateFoodLog } from '@/services/meal-service';
import { palette, radii } from '@/constants/theme';
import type { FoodLogEntry, FoodLogInput, MealType } from '@/types';
import { formatDate, todayStr } from '@/utils/dates';

const MEAL_LABEL: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export default function FoodScreen() {
  const theme = useTheme();
  const foodDate = useDataStore((s) => s.foodDate);
  const foodByDate = useDataStore((s) => s.foodByDate);
  const caloriesByDate = useDataStore((s) => s.caloriesByDate);
  const setFoodDate = useDataStore((s) => s.setFoodDate);
  const loadFood = useDataStore((s) => s.loadFood);

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<FoodLogEntry | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadFood(todayStr());
    }, [loadFood]),
  );

  const meals = foodByDate[foodDate] ?? [];
  const calories = caloriesByDate[foodDate] ?? 0;
  const protein = meals.reduce((s, m) => s + (m.protein ?? 0), 0);
  const carbs = meals.reduce((s, m) => s + (m.carbs ?? 0), 0);
  const fat = meals.reduce((s, m) => s + (m.fat ?? 0), 0);

  const remove = async (id: number) => {
    await deleteFoodLog(id);
    await loadFood(foodDate);
  };

  return (
    <Screen
      title="Food"
      subtitle={foodDate ? formatDate(foodDate) : 'Today'}
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
          Add meal
        </Button>
      }>
      <MonthCalendar
        value={foodDate}
        onChange={setFoodDate}
        maximumDate={new Date()}
        markedDates={Object.keys(foodByDate).filter((d) => (foodByDate[d]?.length ?? 0) > 0)}
      />

      <View style={styles.viewToggle}>
        <Button
          mode={viewMode === 'daily' ? 'contained' : 'outlined'}
          onPress={() => setViewMode('daily')}
          compact>
          Daily
        </Button>
        <Button
          mode={viewMode === 'weekly' ? 'contained' : 'outlined'}
          onPress={() => setViewMode('weekly')}
          compact>
          Weekly
        </Button>
      </View>

      {viewMode === 'weekly' ? (
        <WeeklyFoodSummary endDate={foodDate} refreshKey={refreshKey} />
      ) : (
        <>
      <GlassCard style={styles.summary} contentStyle={styles.summaryContent}>
        <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
          {formatDate(foodDate)}
        </Text>
        <View style={styles.summaryRow}>
          <View>
            <Text style={[styles.calories, { color: theme.colors.onSurface }]}>
              {calories}
              <Text style={styles.kcal}> kcal</Text>
            </Text>
          </View>
          <View style={styles.macroRow}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
              P {Math.round(protein)}g · C {Math.round(carbs)}g · F {Math.round(fat)}g
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
              {meals.length} meal{meals.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </GlassCard>

      {meals.length === 0 ? (
        <EmptyState
          icon="silverware-fork-knife"
          title="No meals logged"
          message="Tap “Add meal” to log what you ate today."
        />
      ) : (
        <View style={styles.list}>
          {meals.map((m) => (
            <Card
              key={m.id}
              style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: palette.chromeWhite }]}
              onPress={() => {
                setEditing(m);
                setShowAdd(true);
              }}>
              <Card.Content style={styles.itemContent}>
                {m.photoUri ? (
                  <Image source={{ uri: m.photoUri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <MaterialCommunityIcons
                      name="silverware-fork-knife"
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </View>
                )}
                <View style={styles.itemText}>
                  <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
                    {m.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {MEAL_LABEL[m.mealType] ?? m.mealType}
                    {m.calories != null ? ` · ${m.calories} kcal` : ''}
                    {m.protein != null ? ` · ${m.protein}g protein` : ''}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                  onPress={() => remove(m.id)}
                />
              </Card.Content>
            </Card>
          ))}
        </View>
      )}
        </>
      )}

      {viewMode === 'daily' ? <Portal>
        <AddMealModal
          visible={showAdd}
          initial={editing}
          onDismiss={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowAdd(false);
            setEditing(null);
            loadFood(foodDate);
            setRefreshKey((value) => value + 1);
          }}
        />
      </Portal> : null}
    </Screen>
  );
}

interface AddMealModalProps {
  visible: boolean;
  initial: FoodLogEntry | null;
  onDismiss: () => void;
  onSaved: () => void;
}

function AddMealModal({ visible, initial, onDismiss, onSaved }: AddMealModalProps) {
  const theme = useTheme();
  const [date, setDate] = useState(todayStr());
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
    if (visible) {
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
        setDate(todayStr());
        setMealType('breakfast');
        setName('');
        setCalories('');
        setProtein('');
        setCarbs('');
        setFat('');
        setPhotoUri(null);
      }
      setError('');
    }
  }, [visible, initial]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setError('Enter a meal name.');
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
    if (initial) {
      await updateFoodLog(initial.id, input);
    } else {
      await addFoodLog(input);
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
        {initial ? 'Edit meal' : 'Add meal'}
      </Text>
      <DateField value={date} onChange={setDate} maximumDate={new Date()} />

      <Text variant="labelMedium" style={styles.fieldLabel}>
        Meal type
      </Text>
      <View style={styles.chips}>
        {MEAL_TYPES.map((t) => {
          const active = t.value === mealType;
          return (
            <Chip
              key={t.value}
              selected={active}
              onPress={() => setMealType(t.value as MealType)}
              showSelectedCheck={false}>
              {t.label}
            </Chip>
          );
        })}
      </View>

      <TextInput
        mode="outlined"
        label="Meal / food"
        value={name}
        onChangeText={setName}
        style={styles.field}
      />

      <View style={styles.macroGrid}>
        <NumberField label="Calories" value={calories} onChange={setCalories} />
        <NumberField label="Protein (g)" value={protein} onChange={setProtein} decimal />
        <NumberField label="Carbs (g)" value={carbs} onChange={setCarbs} decimal />
        <NumberField label="Fat (g)" value={fat} onChange={setFat} decimal />
      </View>

      <View style={styles.photoRow}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty, { borderColor: theme.colors.outlineVariant }]}>
            <MaterialCommunityIcons name="image-outline" size={22} color={theme.colors.onSurfaceVariant} />
          </View>
        )}
        <View style={styles.photoButtons}>
          <Button mode="outlined" compact icon="camera" onPress={pickPhoto}>
            Add photo
          </Button>
          {photoUri ? (
            <Button mode="text" compact onPress={() => setPhotoUri(null)}>
              Remove
            </Button>
          ) : null}
        </View>
      </View>

      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>

      <View style={styles.modalActions}>
        <Button mode="text" onPress={onDismiss}>
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={save}
          loading={busy}
          disabled={busy || !name.trim()}
          buttonColor={palette.vermillion}
          textColor="#fff">
          {initial ? 'Update' : 'Save'}
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewToggle: { flexDirection: 'row', gap: 8, marginTop: 12 },
  summary: { marginTop: 14 },
  summaryContent: { paddingVertical: 14 },
  summaryLabel: { fontSize: 13, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 },
  calories: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
  kcal: { fontSize: 14, fontWeight: '500' },
  macroRow: { alignItems: 'flex-end', gap: 2 },
  list: { gap: 8, marginTop: 12 },
  item: { borderRadius: radii.lg, elevation: 0, borderWidth: StyleSheet.hairlineWidth },
  itemContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  thumb: { width: 44, height: 44, borderRadius: 10, marginRight: 12 },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  itemText: { flex: 1 },
  modal: { margin: 24, borderRadius: radii.xl, padding: 20, maxHeight: '88%' },
  fieldLabel: { marginTop: 12, marginBottom: 4, opacity: 0.8 },
  field: { marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 },
  photoButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 },
});
