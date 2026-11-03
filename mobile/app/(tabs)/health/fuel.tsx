import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Bars, Button, Card, CardHead, CountUp, DayStepper, Empty, IconButton, ListItem, Meter, Ring, Row, Screen, Section, Tap, Text, toast } from '@/components/ui';
import { MealSheet } from '@/components/forms/EntrySheets';
import { MEAL_TYPES } from '@/constants/metrics';
import { GOALS } from '@/constants/goals';
import { ON_PASTEL, ON_PASTEL_MUTED, space } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { bumpData } from '@/hooks/useDataVersion';
import { addHydration, deleteHydration, listHydrationByDate } from '@/services/hydration-service';
import { listFoodBetween } from '@/services/meal-service';
import type { FoodLogEntry, MealType } from '@/types';
import { confirmDestructive } from '@/utils/confirm';
import { parseDateStr, toDateStr, todayStr } from '@/utils/dates';
import { errorMessage } from '@/utils/helpers';

const MEAL_ICONS: Record<MealType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  breakfast: 'coffee-outline',
  lunch: 'food-outline',
  dinner: 'silverware-fork-knife',
  snack: 'cookie-outline',
};

const sum = (xs: (number | null)[]) => xs.reduce<number>((s, x) => s + (x ?? 0), 0);

async function loadFuel(date: string) {
  const start = parseDateStr(date);
  start.setDate(start.getDate() - 6);
  const from = toDateStr(start);
  const [week, water] = await Promise.all([listFoodBetween(from, date), listHydrationByDate(date)]);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toDateStr(d);
  });
  const meals = week.filter((f) => f.date === date);
  return {
    meals,
    water,
    waterMl: sum(water.map((w) => w.amountMl)),
    kcal: sum(meals.map((m) => m.calories)),
    protein: sum(meals.map((m) => m.protein)),
    carbs: sum(meals.map((m) => m.carbs)),
    fat: sum(meals.map((m) => m.fat)),
    weekKcal: days.map((d) => sum(week.filter((f) => f.date === d).map((f) => f.calories))),
    weekLabels: days.map((d) => parseDateStr(d).toLocaleDateString('en-US', { weekday: 'narrow' })),
  };
}

export default function FuelScreen() {
  const [date, setDate] = useState(todayStr());
  const { data } = useFocusData(useCallback(() => loadFuel(date), [date]));
  const [sheet, setSheet] = useState<{ open: boolean; entry: FoodLogEntry | null }>({ open: false, entry: null });

  const addWater = async (ml: number) => {
    try {
      await addHydration(date, ml);
      bumpData();
      toast(`+${ml} ml water`, 'cup-water');
    } catch (e) {
      toast(errorMessage(e, 'Could not log water.'), 'alert-circle');
    }
  };

  const removeWater = (id: number, ml: number) =>
    confirmDestructive('Remove water?', `${ml} ml will be removed.`, async () => {
      await deleteHydration(id);
      bumpData();
    });

  const glasses = Math.round((data?.waterMl ?? 0) / GOALS.glassMl);
  const goalGlasses = GOALS.waterMl / GOALS.glassMl;
  const macroTotal = (data?.protein ?? 0) * 4 + (data?.carbs ?? 0) * 4 + (data?.fat ?? 0) * 9 || 1;

  return (
    <Screen
      back
      eyebrow="Health"
      title="Fuel"
      subtitle="Meals, macros and water."
      right={<IconButton icon="plus" tone="ink" label="Log a meal" onPress={() => setSheet({ open: true, entry: null })} />}>
      <DayStepper date={date} onChange={setDate} />

      <Card index={0} tone="peach">
        <CardHead label="Energy" icon="fire" tone="peach" />
        <View style={styles.hero}>
          <View style={styles.flex}>
            <CountUp value={data?.kcal ?? 0} variant="display" color={ON_PASTEL} />
            <Text variant="small" color={ON_PASTEL_MUTED}>
              of {GOALS.calories.toLocaleString()} kcal
            </Text>
          </View>
          <Ring progress={(data?.kcal ?? 0) / GOALS.calories} color={ON_PASTEL} track="rgba(20,20,19,0.12)" size={80}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={22} color={ON_PASTEL} />
          </Ring>
        </View>
        <View style={{ gap: space.sm, marginTop: space.md }}>
          {(
            [
              ['Protein', data?.protein ?? 0, 4],
              ['Carbs', data?.carbs ?? 0, 4],
              ['Fat', data?.fat ?? 0, 9],
            ] as const
          ).map(([label, grams, kcalPerG]) => (
            <View key={label} style={styles.macro}>
              <Text variant="small" color={ON_PASTEL} style={{ width: 58 }}>
                {label}
              </Text>
              <View style={styles.flex}>
                <Meter progress={(grams * kcalPerG) / macroTotal} color={ON_PASTEL} track="rgba(20,20,19,0.12)" />
              </View>
              <Text variant="small" color={ON_PASTEL} style={{ width: 48, textAlign: 'right' }}>
                {Math.round(grams)} g
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card index={1} tone="sky">
        <CardHead label={`Water · ${((data?.waterMl ?? 0) / 1000).toFixed(2)} L`} icon="cup-water" tone="sky" />
        <Text variant="display" color={ON_PASTEL}>
          {glasses}
          <Text variant="h2" color={ON_PASTEL_MUTED}>
            {' '}
            of {goalGlasses} glasses
          </Text>
        </Text>
        <View style={styles.glasses}>
          {Array.from({ length: Math.max(goalGlasses, glasses) }, (_, i) => (
            <Tap key={i} onPress={() => void addWater(GOALS.glassMl)} scaleTo={0.8} accessibilityLabel="Add a glass of water">
              <MaterialCommunityIcons name={i < glasses ? 'water' : 'water-plus-outline'} size={30} color={ON_PASTEL} />
            </Tap>
          ))}
        </View>
        <Row style={{ marginTop: space.md }}>
          <Button label="+250 ml" small kind="ink" onPress={() => void addWater(250)} style={styles.flex} />
          <Button label="+500 ml" small kind="ink" onPress={() => void addWater(500)} style={styles.flex} />
        </Row>
        {data?.water.length ? (
          <Text variant="small" color={ON_PASTEL_MUTED} style={{ marginTop: space.sm }}>
            Long-press a drop entry below to remove it.
          </Text>
        ) : null}
        <View style={styles.waterLog}>
          {data?.water.map((w) => (
            <Tap key={w.id} onLongPress={() => removeWater(w.id, w.amountMl)} style={styles.waterChip} accessibilityLabel={`${w.amountMl} ml, long-press to remove`}>
              <Text variant="small" color={ON_PASTEL}>
                {w.amountMl} ml
              </Text>
            </Tap>
          ))}
        </View>
      </Card>

      <Card index={2} tone="butter">
        <CardHead label="Calories · 7 days" icon="chart-bar" tone="butter" />
        <Bars values={data?.weekKcal ?? Array(7).fill(0)} labels={data?.weekLabels} labelColor={ON_PASTEL_MUTED} color={ON_PASTEL} dim="rgba(20,20,19,0.25)" highlight={6} barWidth={14} height={80} />
      </Card>

      {MEAL_TYPES.map(({ value, label }) => {
        const items = data?.meals.filter((m) => m.mealType === value) ?? [];
        return (
          <View key={value} style={{ gap: space.sm }}>
            <Section
              title={label}
              right={
                <Text variant="small" muted>
                  {sum(items.map((i) => i.calories))} kcal
                </Text>
              }
            />
            {items.map((m, i) => (
              <ListItem
                key={m.id}
                index={i}
                icon={MEAL_ICONS[value as MealType]}
                iconTone="peach"
                title={m.name}
                subtitle={[m.protein != null && `P ${m.protein}g`, m.carbs != null && `C ${m.carbs}g`, m.fat != null && `F ${m.fat}g`].filter(Boolean).join(' · ') || null}
                value={m.calories != null ? `${m.calories}` : undefined}
                onPress={() => setSheet({ open: true, entry: m })}
              />
            ))}
          </View>
        );
      })}
      {data && data.meals.length === 0 ? (
        <Empty icon="food-apple-outline" title="No meals logged" body="Tap + to log what you ate." action={<Button label="Log a meal" small onPress={() => setSheet({ open: true, entry: null })} />} />
      ) : null}

      <MealSheet open={sheet.open} entry={sheet.entry} date={date} onClose={() => setSheet({ open: false, entry: null })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  macro: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  glasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: space.sm },
  waterLog: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm },
  waterChip: { backgroundColor: 'rgba(20,20,19,0.08)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
