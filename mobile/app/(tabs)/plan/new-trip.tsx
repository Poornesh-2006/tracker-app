import { useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Button, Card, CardHead, DateField, Field, NumberField, Row, Screen, Segmented, Text, parseNum, toast } from '@/components/ui';
import { ErrorText } from '@/components/forms/FormParts';
import { LINE_COLORS, RouteMap, stopNames } from '@/components/plan/RouteMap';
import { useTheme } from '@/constants/theme';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { bumpData } from '@/hooks/useDataVersion';
import { createTrip, type StopInput } from '@/services/travel-service';
import type { TravelTrip } from '@/types';
import { todayStr } from '@/utils/dates';

const MODES = [
  { value: 'metro' as TravelTrip['mode'], label: 'Metro' },
  { value: 'bus' as TravelTrip['mode'], label: 'Bus' },
  { value: 'walk' as TravelTrip['mode'], label: 'Walk' },
  { value: 'mixed' as TravelTrip['mode'], label: 'Mixed' },
];

export default function NewTripScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const [form, setForm] = useState({ date: params.date ?? todayStr(), from: '', to: '', via: '', duration: '', price: '', mode: 'metro' as TravelTrip['mode'], share: true, notes: '' });
  const { busy, error, run } = useAsyncAction();
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const names = useMemo(() => stopNames(form.from, form.via, form.to), [form.from, form.via, form.to]);
  const price = parseNum(form.price);
  const perLeg = price != null && Number.isFinite(price) && names.length > 1 ? price / (names.length - 1) : null;

  const save = () =>
    run(async () => {
      if (!form.from.trim() || !form.to.trim()) throw new Error('Add where you start and where you’re going.');
      const duration = parseNum(form.duration);
      if (duration != null && (!Number.isFinite(duration) || duration <= 0)) throw new Error('Duration must be a positive number of minutes.');
      if (price != null && (!Number.isFinite(price) || price < 0)) throw new Error('Price can’t be negative.');
      const stops: StopInput[] = names.map((name, i) => ({
        name,
        area: i === 0 ? 'Start' : i === names.length - 1 ? 'Destination' : 'Change',
        priceFromPrev: i === 0 ? null : perLeg,
        lineColor: LINE_COLORS[i % LINE_COLORS.length],
        action: i === 0 ? 'Board' : i === names.length - 1 ? 'Arrive' : 'Change',
      }));
      const id = await createTrip({
        date: form.date,
        title: `${form.from.trim()} → ${form.to.trim()}`,
        fromName: form.from,
        toName: form.to,
        mode: form.mode,
        totalPrice: price,
        durationMin: duration,
        shareWithParents: form.share,
        notes: form.notes.trim() || null,
        stops,
        addToTodo: true,
      });
      bumpData();
      toast('Trip planned · added to tasks', 'subway-variant');
      router.replace({ pathname: '/(tabs)/plan/trip', params: { id: String(id) } } as unknown as Href);
    });

  return (
    <Screen back eyebrow="Plan" title="New trip">
      <Segmented options={MODES} value={form.mode} onChange={(mode) => setForm((f) => ({ ...f, mode }))} />
      <Field label="From" value={form.from} onChangeText={set('from')} placeholder="Station or area" autoFocus />
      <Field label="Via (optional, comma separated)" value={form.via} onChangeText={set('via')} placeholder="Interchange stations" />
      <Field label="To" value={form.to} onChangeText={set('to')} placeholder="Destination" />
      <Row>
        <View style={styles.flex}>
          <NumberField label="Duration" value={form.duration} onChangeText={set('duration')} suffix="min" integer />
        </View>
        <View style={styles.flex}>
          <NumberField label="Fare" value={form.price} onChangeText={set('price')} suffix="₹" />
        </View>
      </Row>
      <DateField label="Date" value={form.date} onChange={set('date')} />
      <Card tone="surface">
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text variant="title">Share with parents</Text>
            <Text variant="small" muted>
              Lets you send your live location while traveling.
            </Text>
          </View>
          <Switch value={form.share} onValueChange={(share) => setForm((f) => ({ ...f, share }))} trackColor={{ true: c.ink }} accessibilityLabel="Share with parents" />
        </View>
      </Card>
      <Field label="Notes" value={form.notes} onChangeText={set('notes')} multiline />

      {names.length >= 2 ? (
        <Card tone="sky" index={0}>
          <CardHead label={`Preview · ${names.length} stops`} icon="map-marker-path" tone="sky" />
          <RouteMap stops={names.map((name, i) => ({ name, caption: i === 0 ? 'Board' : i === names.length - 1 ? 'Arrive' : perLeg != null ? `Change · ≈ ₹${perLeg.toFixed(0)} leg` : 'Change', color: LINE_COLORS[i % LINE_COLORS.length] }))} />
        </Card>
      ) : null}

      <ErrorText error={error} />
      <Button label="Save trip" icon="check" onPress={save} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
