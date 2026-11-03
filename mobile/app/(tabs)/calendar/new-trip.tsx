import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  HelperText,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { GlassCard } from '@/components/GlassCard';
import { NumberField } from '@/components/NumberField';
import { MetroRouteMap } from '@/components/MetroRouteMap';
import { createTrip, type StopInput } from '@/services/travel-service';
import { palette, radii } from '@/constants/theme';
import { todayStr } from '@/utils/dates';

const LINE_COLORS = ['#4EA8DE', '#EB5E28', '#2A9D8F', '#9B5DE5', '#F4A261'];

export default function NewTripScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date || todayStr();

  const [fromName, setFromName] = useState('');
  const [toName, setToName] = useState('');
  const [via, setVia] = useState('');
  const [duration, setDuration] = useState('35');
  const [price, setPrice] = useState('40');
  const [share, setShare] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const previewStops = useMemo(() => {
    const names = [fromName.trim(), ...via.split(',').map((s) => s.trim()).filter(Boolean), toName.trim()].filter(
      Boolean,
    );
    if (names.length < 2) return [];
    const totalPrice = Number(price) || 0;
    const seg = Math.max(names.length - 1, 1);
    return names.map((name, i) => ({
      id: i,
      tripId: 0,
      name,
      area: i === 0 ? 'Start' : i === names.length - 1 ? 'Destination' : `Interchange ${i}`,
      lat: null,
      lng: null,
      orderIndex: i,
      distanceFromPrevKm: i === 0 ? null : 2.4 + i * 0.6,
      priceFromPrev: i === 0 ? null : totalPrice / seg,
      lineName: i === 0 ? null : i % 2 === 0 ? 'CENTRAL' : 'VICTORIA',
      lineColor: LINE_COLORS[i % LINE_COLORS.length],
      action: i === 0 ? 'Board' : i === names.length - 1 ? 'Arrive' : 'Change',
    }));
  }, [fromName, toName, via, price]);

  const save = async () => {
    if (!fromName.trim() || !toName.trim()) {
      setError('From and To are required');
      return;
    }
    setBusy(true);
    const stops: StopInput[] = previewStops.map((s) => ({
      name: s.name,
      area: s.area,
      distanceFromPrevKm: s.distanceFromPrevKm,
      priceFromPrev: s.priceFromPrev,
      lineName: s.lineName,
      lineColor: s.lineColor,
      action: s.action,
    }));
    const totalDistance = stops.reduce((a, s) => a + (s.distanceFromPrevKm ?? 0), 0);
    const id = await createTrip({
      date,
      title: `${fromName.trim()} → ${toName.trim()}`,
      fromName: fromName.trim(),
      toName: toName.trim(),
      mode: 'metro',
      totalPrice: Number(price) || null,
      totalDistanceKm: totalDistance || null,
      durationMin: Number(duration) || null,
      shareWithParents: share,
      stops,
      addToTodo: true,
    });
    setBusy(false);
    router.replace({ pathname: '/(tabs)/calendar/trip', params: { id: String(id) } } as unknown as Href);
  };

  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.pad}
      keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: muted }]}>Date · {date}</Text>
      <Text style={[styles.title, { color: ink }]}>Plan your trip</Text>

      <TextInput
        mode="outlined"
        label="From (station / area)"
        value={fromName}
        onChangeText={setFromName}
        outlineColor={palette.chromeWhite}
        activeOutlineColor={palette.vermillion}
        style={styles.field}
      />
      <TextInput
        mode="outlined"
        label="To (station / area)"
        value={toName}
        onChangeText={setToName}
        outlineColor={palette.chromeWhite}
        activeOutlineColor={palette.vermillion}
        style={styles.field}
      />
      <TextInput
        mode="outlined"
        label="Via stops (comma separated)"
        value={via}
        onChangeText={setVia}
        placeholder="Oxford Circus, Bank"
        outlineColor={palette.chromeWhite}
        activeOutlineColor={palette.vermillion}
        style={styles.field}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <NumberField label="Duration (min)" value={duration} onChange={setDuration} />
        </View>
        <View style={{ flex: 1 }}>
          <NumberField label="Price (₹)" value={price} onChange={setPrice} decimal />
        </View>
      </View>

      <GlassCard contentStyle={styles.shareRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: ink, fontWeight: '700' }}>Update parents</Text>
          <Text style={{ color: muted, fontSize: 12 }}>Share live location while traveling</Text>
        </View>
        <Switch value={share} onValueChange={setShare} color={palette.vermillion} />
      </GlassCard>

      {previewStops.length >= 2 ? (
        <View style={{ marginTop: 14 }}>
          <MetroRouteMap stops={previewStops} />
          <View style={styles.legend}>
            {previewStops.slice(1).map((s, i) => (
              <Chip key={i} style={{ marginRight: 6, marginTop: 6 }} textStyle={{ fontSize: 11 }}>
                {(s.lineName || 'LINE') + ` · ₹${(s.priceFromPrev ?? 0).toFixed(0)}`}
              </Chip>
            ))}
          </View>
        </View>
      ) : null}

      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>

      <Button
        mode="contained"
        buttonColor={palette.vermillion}
        textColor="#fff"
        loading={busy}
        onPress={save}
        style={styles.save}
        contentStyle={{ paddingVertical: 6 }}>
        Save trip + add to Todo
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 60 },
  label: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 12, letterSpacing: -0.4 },
  field: { marginTop: 8, backgroundColor: 'transparent' },
  row: { flexDirection: 'row', gap: 10 },
  shareRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  save: { marginTop: 12, borderRadius: radii.md },
});
