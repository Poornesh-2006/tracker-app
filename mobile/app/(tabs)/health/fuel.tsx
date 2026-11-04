import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Bars, Button, Card, CardHead, CountUp, DayStepper, Empty, IconButton, ListItem, Meter, Ring, Row, Screen, Section, Tap, Text, Icon } from '@/components/ui';
import { MealSheet } from '@/components/forms/EntrySheets';
import { MEAL_TYPES } from '@/constants/metrics';
import { GOALS } from '@/constants/goals';
import { space, brand } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { askDelete, logWater } from '@/components/forms/actions';
import { deleteHydration, listHydrationByDate } from '@/services/hydration-service';
import { listFoodBetween } from '@/services/meal-service';
import type { FoodLogEntry, MealType } from '@/types';
import { lastNDays, todayStr, weekdayNarrow } from '@/utils/dates';
import { sum } from '@/utils/helpers';

const MEAL_ICONS: Record<MealType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  breakfast: 'coffee-outline',
  lunch: 'food-outline',
  dinner: 'silverware-fork-knife',
  snack: 'cookie-outline',
};

async function loadFuel(date: string) {
  const days = lastNDays(7, date);
  const [week, water] = await Promise.all([listFoodBetween(days[0], date), listHydrationByDate(date)]);
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
    weekLabels: days.map(weekdayNarrow),
  };
}

export default function FuelScreen() {
  const [date, setDate] = useState(todayStr());
  const { data } = useFocusData(useCallback(() => loadFuel(date), [date]));
  const [sheet, setSheet] = useState<{ open: boolean; entry: FoodLogEntry | null }>({ open: false, entry: null });

  const addWater = (ml: number) => logWater(date, ml);
  const removeWater = (id: number, ml: number) => askDelete(`${ml} ml of water`, () => deleteHydration(id));

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
            <CountUp value={data?.kcal ?? 0} variant="display" />
            <Text variant="small" muted>
              of {GOALS.calories.toLocaleString()} kcal
            </Text>
          </View>
          <Ring progress={(data?.kcal ?? 0) / GOALS.calories} size={80}>
            <Icon name="silverware-fork-knife" size={22} />
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
              <Text variant="small" style={{ width: 58 }}>
                {label}
              </Text>
              <View style={styles.flex}>
                <Meter progress={(grams * kcalPerG) / macroTotal} />
              </View>
              <Text variant="small" style={{ width: 48, textAlign: 'right' }}>
                {Math.round(grams)} g
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card index={1} tone="sky">
        <CardHead label={`Water · ${((data?.waterMl ?? 0) / 1000).toFixed(2)} L`} icon="cup-water" tone="sky" />
        <Text variant="display">
          {glasses}
          <Text variant="h2" muted>
            {' '}
            of {goalGlasses} glasses
          </Text>
        </Text>
        <View style={styles.glasses}>
          {Array.from({ length: Math.max(goalGlasses, glasses) }, (_, i) => (
            <Tap key={i} onPress={() => void addWater(GOALS.glassMl)} scaleTo={0.8} accessibilityLabel="Add a glass of water">
              <Icon name={i < glasses ? 'water' : 'water-outline'} size={30} color={i < glasses ? brand.orange : undefined} />
            </Tap>
          ))}
        </View>
        <Row style={{ marginTop: space.md }}>
          <Button label="+250 ml" small kind="ink" onPress={() => void addWater(250)} style={styles.flex} />
          <Button label="+500 ml" small kind="ink" onPress={() => void addWater(500)} style={styles.flex} />
        </Row>
        {data?.water.length ? (
          <Text variant="small" muted style={{ marginTop: space.sm }}>
            Long-press an entry below to remove it.
          </Text>
        ) : null}
        <View style={styles.waterLog}>
          {data?.water.map((w) => (
            <Tap key={w.id} onLongPress={() => removeWater(w.id, w.amountMl)} style={styles.waterChip} accessibilityLabel={`${w.amountMl} ml, long-press to remove`}>
              <Text variant="small">
                {w.amountMl} ml
              </Text>
            </Tap>
          ))}
        </View>
      </Card>

      <Card index={2} tone="butter">
        <CardHead label="Calories · 7 days" icon="chart-bar" tone="butter" />
        <Bars values={data?.weekKcal ?? Array(7).fill(0)} labels={data?.weekLabels} highlight={6} barWidth={14} height={80} />
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

      <MealSheet open={sheet.open} entry={sheet.entry} date={date} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
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
