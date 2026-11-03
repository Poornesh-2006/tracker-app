import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Share, StyleSheet, Switch, View } from 'react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, CardHead, DotMatrix, Empty, Row, Screen, Text, toast } from '@/components/ui';
import { RouteMap } from '@/components/plan/RouteMap';
import { ON_PASTEL, space, useTheme } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { bumpData } from '@/hooks/useDataVersion';
import { deleteTrip, getTrip, googleMapsDirectionsUrl, googleMapsPinUrl, listStops, setTripShare, setTripStatus, upsertLiveLocation } from '@/services/travel-service';
import { confirmDestructive } from '@/utils/confirm';
import { formatDate } from '@/utils/dates';
import { errorMessage } from '@/utils/helpers';

export default function TripScreen() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = Number(id);
  const { data, reload } = useFocusData(useCallback(() => Promise.all([getTrip(tripId), listStops(tripId)]), [tripId]));
  const [tracking, setTracking] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const watch = useRef<Location.LocationSubscription | null>(null);

  const [trip, stops] = data ?? [null, []];

  // Always release GPS when leaving the screen.
  useEffect(() => () => watch.current?.remove(), []);

  useEffect(() => {
    if (!tracking) return;
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed((Date.now() - t0) / 60000), 5000);
    return () => clearInterval(timer);
  }, [tracking]);

  if (data && !trip) {
    return (
      <Screen back title="Trip">
        <Empty icon="subway-variant" title="Trip not found" body="It may have been deleted." />
      </Screen>
    );
  }
  if (!trip) return <Screen back title="Trip">{null}</Screen>;

  const start = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        toast('Location permission is needed to track', 'alert-circle');
        return;
      }
      await setTripStatus(trip.id, 'active');
      setElapsed(0);
      setTracking(true);
      watch.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 }, (loc) => {
        const next = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setCoords(next);
        void upsertLiveLocation({ tripId: trip.id, ...next, heading: loc.coords.heading ?? null, shareWithParents: trip.shareWithParents }).catch(() => undefined);
      });
      bumpData();
    } catch (e) {
      setTracking(false);
      toast(errorMessage(e, 'Could not start tracking.'), 'alert-circle');
    }
  };

  const finish = async () => {
    watch.current?.remove();
    watch.current = null;
    setTracking(false);
    await setTripStatus(trip.id, 'done');
    bumpData();
    toast('Trip complete', 'flag-checkered');
  };

  const share = () =>
    void Share.share({
      message: `I'm traveling: ${trip.fromName} → ${trip.toName}\nStatus: ${tracking ? 'on the way' : trip.status}\n${coords ? googleMapsPinUrl(coords.lat, coords.lng) : googleMapsDirectionsUrl(trip.fromName, trip.toName)}`,
    });

  const remove = () =>
    confirmDestructive('Delete trip?', `${trip.title} will be removed.`, async () => {
      watch.current?.remove();
      await deleteTrip(trip.id);
      bumpData();
      router.back();
    });

  const progress = tracking && trip.durationMin ? Math.min(1, elapsed / trip.durationMin) : trip.status === 'done' ? 1 : null;

  return (
    <Screen back eyebrow={formatDate(trip.date)} title={trip.title}>
      <Card index={0} tone={tracking ? 'accent' : 'ink'}>
        <CardHead label={tracking ? 'On the way' : trip.status === 'done' ? 'Arrived' : 'Planned'} icon={tracking ? 'navigation-variant' : 'subway-variant'} tone={tracking ? 'accent' : 'ink'} />
        <DotMatrix text={tracking ? `${Math.floor(elapsed)}MIN` : `${trip.durationMin ?? '--'}MIN`} dot={6} color={tracking ? '#fff' : c.onInk} offColor="transparent" />
        <Row style={{ marginTop: space.md }}>
          {trip.status !== 'done' ? (
            tracking ? (
              <Button label="Arrived" icon="flag-checkered" kind="pink" onPress={() => void finish()} style={styles.flex} />
            ) : (
              <Button label="Start trip" icon="play" kind="pink" onPress={() => void start()} style={styles.flex} />
            )
          ) : null}
          <Button label="Share" icon="share-variant" kind="ghost" onPress={share} style={[styles.flex, { borderColor: 'rgba(255,255,255,0.3)' }]} />
        </Row>
      </Card>

      <Card index={1} tone="sky">
        <CardHead label={`${stops.length} stops${trip.totalPrice != null ? ` · ₹${trip.totalPrice}` : ''}`} icon="map-marker-path" tone="sky" />
        <RouteMap stops={stops.map((s) => ({ name: s.name, caption: s.action, color: s.lineColor }))} progress={progress} />
      </Card>

      <Card index={2}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="title">Share with parents</Text>
            <Text variant="small" muted>
              Live location is saved while the trip is active.
            </Text>
          </View>
          <Switch
            value={trip.shareWithParents}
            onValueChange={async (v) => {
              await setTripShare(trip.id, v);
              await reload();
            }}
            trackColor={{ true: c.ink }}
            accessibilityLabel="Share with parents"
          />
        </View>
      </Card>

      {trip.notes ? (
        <Card index={3} tone="butter">
          <CardHead label="Notes" tone="butter" />
          <Text color={ON_PASTEL}>{trip.notes}</Text>
        </Card>
      ) : null}
      {coords ? (
        <Text variant="small" muted>
          Last fix {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </Text>
      ) : null}

      <Button label="Open in Google Maps" icon="google-maps" kind="ghost" onPress={() => void Linking.openURL(googleMapsDirectionsUrl(trip.fromName, trip.toName))} />
      <Button label="Delete trip" icon="delete-outline" kind="ghost" onPress={remove} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
