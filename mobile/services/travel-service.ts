import { all, allAs, bool, deleteById, insert, run, transaction } from './db';
import type { TravelLive, TravelStop, TravelTrip } from '@/types';
import { addTodo } from './todo-service';

const TRIP_COLS =
  'id, date, title, from_name, to_name, mode, total_price, total_distance_km, duration_min, share_with_parents, notes, status';
const STOP_COLS =
  'id, trip_id, name, area, lat, lng, order_index, distance_from_prev_km, price_from_prev, line_name, line_color, action';
const TRIP_BOOLS = ['shareWithParents'] as const;

export type StopInput = {
  name: string;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  distanceFromPrevKm?: number | null;
  priceFromPrev?: number | null;
  lineName?: string | null;
  lineColor?: string | null;
  action?: string | null;
};

export function listTripsByDate(date: string): Promise<TravelTrip[]> {
  return allAs(`SELECT ${TRIP_COLS} FROM travel_trips WHERE date = ? ORDER BY id DESC`, [date], TRIP_BOOLS);
}

export async function listTripDates(): Promise<string[]> {
  const rows = await all<{ date: string }>(`SELECT DISTINCT date FROM travel_trips ORDER BY date ASC`);
  return rows.map((r) => r.date);
}

export async function getTrip(id: number): Promise<TravelTrip | null> {
  const [trip] = await allAs<TravelTrip>(`SELECT ${TRIP_COLS} FROM travel_trips WHERE id = ?`, [id], TRIP_BOOLS);
  return trip ?? null;
}

export function listStops(tripId: number): Promise<TravelStop[]> {
  return allAs(`SELECT ${STOP_COLS} FROM travel_stops WHERE trip_id = ? ORDER BY order_index ASC`, [tripId]);
}

/** Trip, its stops and the optional todo are written atomically. */
export async function createTrip(input: {
  date: string;
  title: string;
  fromName: string;
  toName: string;
  mode?: TravelTrip['mode'];
  totalPrice?: number | null;
  totalDistanceKm?: number | null;
  durationMin?: number | null;
  shareWithParents?: boolean;
  notes?: string | null;
  stops: StopInput[];
  addToTodo?: boolean;
}): Promise<number> {
  let tripId = 0;
  await transaction(async () => {
    tripId = await insert(
      `INSERT INTO travel_trips
        (date, title, from_name, to_name, mode, total_price, total_distance_km, duration_min, share_with_parents, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.date,
      input.title.trim(),
      input.fromName.trim(),
      input.toName.trim(),
      input.mode ?? 'metro',
      input.totalPrice ?? null,
      input.totalDistanceKm ?? null,
      input.durationMin ?? null,
      bool(input.shareWithParents),
      input.notes ?? null,
    );
    for (const [i, s] of input.stops.entries()) {
      await insert(
        `INSERT INTO travel_stops
          (trip_id, name, area, lat, lng, order_index, distance_from_prev_km, price_from_prev, line_name, line_color, action)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        tripId,
        s.name.trim(),
        s.area ?? null,
        s.lat ?? null,
        s.lng ?? null,
        i,
        s.distanceFromPrevKm ?? null,
        s.priceFromPrev ?? null,
        s.lineName ?? null,
        s.lineColor ?? '#EB5E28',
        s.action ?? null,
      );
    }
    if (input.addToTodo !== false) {
      await addTodo(`Travel: ${input.fromName.trim()} → ${input.toName.trim()}`, 'travel', input.date);
    }
  });
  return tripId;
}

/** Stops go with the trip via ON DELETE CASCADE. */
export async function deleteTrip(id: number): Promise<void> {
  await transaction(async () => {
    const [trip] = await all<{ date: string; from_name: string; to_name: string }>(`SELECT date, from_name, to_name FROM travel_trips WHERE id = ?`, id);
    await run(`DELETE FROM travel_stops WHERE trip_id = ?`, id);
    await deleteById('travel_trips', id);
    await run(`DELETE FROM travel_live WHERE trip_id = ?`, id);
    // The "Travel: A → B" task createTrip added (only if still open).
    if (trip) await run(`DELETE FROM todos WHERE title = ? AND due_date = ? AND done = 0`, `Travel: ${trip.from_name} → ${trip.to_name}`, trip.date);
  });
}

export async function setTripShare(id: number, share: boolean): Promise<void> {
  await run(`UPDATE travel_trips SET share_with_parents = ? WHERE id = ?`, bool(share), id);
}

export async function setTripStatus(id: number, status: TravelTrip['status']): Promise<void> {
  await run(`UPDATE travel_trips SET status = ? WHERE id = ?`, status, id);
}

/** Single-row table (id = 1). `shareWithParents` omitted keeps the stored flag. */
export async function upsertLiveLocation(input: {
  tripId: number | null;
  lat: number;
  lng: number;
  heading?: number | null;
  shareWithParents?: boolean;
}): Promise<void> {
  const share = input.shareWithParents == null ? null : bool(input.shareWithParents);
  const changed = await run(
    `UPDATE travel_live SET trip_id = ?, lat = ?, lng = ?, heading = ?, updated_at = datetime('now'),
       share_with_parents = COALESCE(?, share_with_parents)
     WHERE id = 1`,
    input.tripId,
    input.lat,
    input.lng,
    input.heading ?? null,
    share,
  );
  if (changed === 0) {
    await run(
      `INSERT INTO travel_live (id, trip_id, lat, lng, heading, updated_at, share_with_parents)
       VALUES (1, ?, ?, ?, ?, datetime('now'), ?)`,
      input.tripId,
      input.lat,
      input.lng,
      input.heading ?? null,
      share ?? 0,
    );
  }
}

export async function getLiveLocation(): Promise<TravelLive | null> {
  const [live] = await allAs<TravelLive>(
    `SELECT trip_id, lat, lng, heading, updated_at, share_with_parents FROM travel_live WHERE id = 1`,
    [],
    ['shareWithParents'],
  );
  return live ?? null;
}


/** Haversine distance in km */
export function googleMapsDirectionsUrl(from: string, to: string): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=transit`;
}

export function googleMapsPinUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
