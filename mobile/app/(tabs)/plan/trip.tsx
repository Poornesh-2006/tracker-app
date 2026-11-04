import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, CardHead, DotMatrix, Empty, Row, Screen, Text, toast } from '@/components/ui';
import { askDelete, attempt } from '@/components/forms/actions';
import { RouteMap } from '@/components/plan/RouteMap';
import { space } from '@/constants/theme';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useFocusData } from '@/hooks/useFocusData';
import { deleteTrip, getTrip, googleMapsDirectionsUrl, googleMapsPinUrl, listStops, setTripStatus, upsertLiveLocation } from '@/services/travel-service';
import { formatDate } from '@/utils/dates';
import { openLink } from '@/utils/links';

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = Number(id);
  const { data } = useFocusData(useCallback(() => Promise.all([getTrip(tripId), listStops(tripId)]), [tripId]));
  const [watching, setWatching] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const watch = useRef<Location.LocationSubscription | null>(null);
  const mounted = useRef(true);
  const starting = useAsyncAction();

  const [trip, stops] = data ?? [null, []];
  const active = trip?.status === 'active';

  const stopWatching = () => {
    watch.current?.remove();
    watch.current = null;
    setWatching(false);
  };

  // Release GPS when leaving; a watcher that resolves after unmount is removed on arrival.
  useEffect(
    () => () => {
      mounted.current = false;
      watch.current?.remove();
      watch.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!watching) return;
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [watching]);

  if (data && !trip) {
    return (
      <Screen back title="Trip">
        <Empty icon="subway-variant" title="Trip not found" body="It may have been deleted." />
      </Screen>
    );
  }
  if (!trip) return <Screen back title="Trip">{null}</Screen>;

  /** Starts (or resumes) GPS tracking. Guarded against double taps by useAsyncAction. */
  const start = () =>
    starting.run(async () => {
      if (watch.current) return;
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') throw new Error('Location permission is needed to track the trip.');
      const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 }, (loc) => {
        const next = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setCoords(next);
        void upsertLiveLocation({ tripId: trip.id, ...next, heading: loc.coords.heading ?? null }).catch(() => undefined);
      });
      if (!mounted.current || watch.current) {
        sub.remove(); // screen left (or a second start won) while we waited
        return;
      }
      watch.current = sub;
      setWatching(true);
      setStartedAt(Date.now());
      if (!active) await attempt(() => setTripStatus(trip.id, 'active'));
    }, 'Could not start tracking.');

  const finish = async () => {
    stopWatching();
    if (await attempt(() => setTripStatus(trip.id, 'done'), 'Could not finish the trip.')) toast('Trip complete', 'flag-checkered');
  };

  const share = () =>
    void Share.share({
      message: `I'm traveling: ${trip.fromName} → ${trip.toName}\nStatus: ${active ? 'on the way' : trip.status}\n${coords ? googleMapsPinUrl(coords.lat, coords.lng) : googleMapsDirectionsUrl(trip.fromName, trip.toName)}`,
    });

  const remove = () =>
    askDelete(trip.title, async () => {
      stopWatching();
      await deleteTrip(trip.id);
    }, () => router.back());

  const minutes = startedAt ? Math.floor((now - startedAt) / 60000) : 0;
  const progress = trip.status === 'done' ? 1 : watching && trip.durationMin ? Math.min(1, minutes / trip.durationMin) : null;
  const headTone = active ? 'accent' : 'ink';

  return (
    <Screen back eyebrow={formatDate(trip.date)} title={trip.title}>
      <Card index={0} tone={headTone}>
        <CardHead
          label={active ? (watching ? 'On the way · tracking' : 'On the way · tracking paused') : trip.status === 'done' ? 'Arrived' : 'Planned'}
          icon={active ? 'navigation-variant' : 'subway-variant'}
          tone={headTone}
        />
        <DotMatrix text={watching ? `${minutes}MIN` : `${trip.durationMin ?? '--'}MIN`} dot={6} offColor="transparent" />
        <Row style={{ marginTop: space.md }}>
          {trip.status === 'planned' ? <Button label="Start trip" icon="play" kind="pink" onPress={() => void start()} loading={starting.busy} style={styles.flex} /> : null}
          {active && !watching ? <Button label="Resume" icon="play" kind="pink" onPress={() => void start()} loading={starting.busy} style={styles.flex} /> : null}
          {active ? <Button label="Arrived" icon="flag-checkered" kind="inverse" onPress={() => void finish()} style={styles.flex} /> : null}
        </Row>
        <Button label="Share trip" icon="share-variant" kind="inverse" onPress={share} style={{ marginTop: space.sm }} />
        {starting.error ? (
          <Text variant="small" style={{ marginTop: space.sm }}>
            {starting.error}
          </Text>
        ) : null}
      </Card>

      <Card index={1} tone="sky">
        <CardHead label={`${stops.length} stops${trip.totalPrice != null ? ` · ₹${trip.totalPrice}` : ''}`} icon="map-marker-path" tone="sky" />
        <RouteMap stops={stops.map((s) => ({ name: s.name, caption: s.action, color: s.lineColor }))} progress={progress} />
      </Card>

      {trip.notes ? (
        <Card index={2} tone="butter">
          <CardHead label="Notes" tone="butter" />
          <Text>{trip.notes}</Text>
        </Card>
      ) : null}
      {coords ? (
        <Text variant="small" muted>
          Last GPS fix {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)} · shared only when you tap Share
        </Text>
      ) : null}

      <Button label="Open in Google Maps" icon="google-maps" kind="ghost" onPress={() => void openLink(googleMapsDirectionsUrl(trip.fromName, trip.toName))} />
      <Button label="Delete trip" icon="delete-outline" kind="ghost" onPress={remove} />
    </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
