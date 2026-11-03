import { allAs, deleteById, first, insert } from './db';
import type { HydrationEntry } from '@/types';

export function addHydration(date: string, amountMl: number, note?: string | null): Promise<number> {
  return insert(`INSERT INTO hydration_log (date, amount_ml, note) VALUES (?, ?, ?)`, date, amountMl, note ?? null);
}

export function listHydrationByDate(date: string): Promise<HydrationEntry[]> {
  return allAs<HydrationEntry>(`SELECT * FROM hydration_log WHERE date = ? ORDER BY id DESC`, [date]);
}

export async function totalHydrationMl(date: string): Promise<number> {
  const row = await first<{ total: number | null }>(
    `SELECT COALESCE(SUM(amount_ml), 0) AS total FROM hydration_log WHERE date = ?`,
    date,
  );
  return row?.total ?? 0;
}

export const deleteHydration = (id: number) => deleteById('hydration_log', id);
