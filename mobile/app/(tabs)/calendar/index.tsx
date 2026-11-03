import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Screen } from '@/components/Screen';
import { MonthCalendar } from '@/components/MonthCalendar';
import { GlassCard } from '@/components/GlassCard';
import { MetroRouteMap } from '@/components/MetroRouteMap';
import { useDataStore } from '@/stores/data';
import { palette, radii } from '@/constants/theme';
import { listStops, listTripDates, listTripsByDate } from '@/services/travel-service';
import type { TravelStop, TravelTrip } from '@/types';
import { todayStr } from '@/utils/dates';

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [date, setDate] = useState(todayStr());
  const [trips, setTrips] = useState<TravelTrip[]>([]);
  const [tripDates, setTripDates] = useState<string[]>([]);
  const [previewStops, setPreviewStops] = useState<TravelStop[]>([]);
  const loadDashboard = useDataStore((s) => s.loadDashboard);
  const metrics = useDataStore((s) => s.metrics);
  const workouts = useDataStore((s) => s.workouts);
  const bloodTests = useDataStore((s) => s.bloodTests);
  const foodByDate = useDataStore((s) => s.foodByDate);
  const loadFood = useDataStore((s) => s.loadFood);

  const reloadTrips = useCallback(async (d: string) => {
    const [list, dates] = await Promise.all([listTripsByDate(d), listTripDates()]);
    setTrips(list);
    setTripDates(dates);
    if (list[0]) {
      setPreviewStops(await listStops(list[0].id));
    } else {
      setPreviewStops([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      loadFood(date);
      reloadTrips(date);
    }, [loadDashboard, loadFood, date, reloadTrips]),
  );

  const marked = useMemo(() => {
    const set = new Set<string>();
    metrics.forEach((m) => set.add(m.date));
    workouts.forEach((w) => set.add(w.date));
    bloodTests.forEach((t) => set.add(t.date));
    Object.keys(foodByDate).forEach((d) => {
      if ((foodByDate[d]?.length ?? 0) > 0) set.add(d);
    });
    tripDates.forEach((d) => set.add(d));
    return [...set];
  }, [metrics, workouts, bloodTests, foodByDate, tripDates]);

  const dayWorkouts = workouts.filter((w) => w.date === date);
  const dayTests = bloodTests.filter((t) => t.date === date);
  const dayMeals = foodByDate[date] ?? [];
  const dayMetric = metrics.find((m) => m.date === date);
  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;

  return (
    <Screen title="Calendar" subtitle="Plans · travel · day log">
      <MonthCalendar
        value={date}
        onChange={(d) => {
          setDate(d);
          loadFood(d);
          reloadTrips(d);
        }}
        markedDates={marked}
      />

      <View style={styles.travelHeader}>
        <Text style={[styles.sectionTitle, { color: ink }]}>Travel</Text>
        <Button
          mode="contained"
          compact
          buttonColor={palette.vermillion}
          textColor="#fff"
          style={{ borderRadius: radii.pill }}
          icon="subway"
          onPress={() =>
            router.push({ pathname: '/(tabs)/calendar/new-trip', params: { date } } as unknown as Href)
          }>
          Add trip
        </Button>
      </View>

      {previewStops.length > 0 ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(tabs)/calendar/trip',
              params: { id: String(trips[0].id) },
            } as unknown as Href)
          }>
          <MetroRouteMap stops={previewStops} compact />
        </Pressable>
      ) : null}

      {trips.length === 0 ? (
        <GlassCard style={styles.dayCard} contentStyle={styles.dayContent}>
          <Text style={{ color: muted }}>
            No trips for this day. Add a metro / travel plan — it also shows in Todo.
          </Text>
        </GlassCard>
      ) : (
        <View style={styles.tripList}>
          {trips.map((t) => (
            <Pressable
              key={t.id}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/calendar/trip',
                  params: { id: String(t.id) },
                } as unknown as Href)
              }>
              <GlassCard contentStyle={styles.tripCard}>
                <View style={[styles.icon, { backgroundColor: palette.vermillion + '18' }]}>
                  <MaterialCommunityIcons name="subway-variant" size={20} color={palette.vermillion} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: ink, fontWeight: '800' }}>{t.title}</Text>
                  <Text style={{ color: muted, fontSize: 12 }}>
                    {t.fromName} → {t.toName}
                    {t.durationMin != null ? ` · ${t.durationMin} min` : ''}
                    {t.totalPrice != null ? ` · ₹${t.totalPrice}` : ''}
                  </Text>
                  {t.shareWithParents ? (
                    <Text style={{ color: palette.vermillion, fontSize: 11, marginTop: 2 }}>
                      Sharing live location with parents
                    </Text>
                  ) : null}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={muted} />
              </GlassCard>
            </Pressable>
          ))}
        </View>
      )}

      <GlassCard style={styles.dayCard} contentStyle={styles.dayContent}>
        <Text style={[styles.dayTitle, { color: ink }]}>On this day</Text>
        <Text style={{ color: muted, marginTop: 6 }}>
          {dayMetric
            ? `Steps ${dayMetric.steps ?? '—'} · Sleep ${dayMetric.sleepHours ?? '—'}h · HR ${dayMetric.heartRate ?? '—'}`
            : 'No metrics logged'}
        </Text>
        <Text style={{ color: muted, marginTop: 4 }}>
          {dayMeals.length} meals · {dayWorkouts.length} workouts · {dayTests.length} labs ·{' '}
          {trips.length} trips
        </Text>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  travelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  tripList: { gap: 8, marginTop: 10 },
  tripCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCard: { marginTop: 14 },
  dayContent: { paddingVertical: 16 },
  dayTitle: { fontSize: 16, fontWeight: '800' },
});
