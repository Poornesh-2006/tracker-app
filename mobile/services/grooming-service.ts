import { allAs, deleteById, insert } from './db';
import type { GroomingRoutine } from '@/types';

export function listRoutines(): Promise<GroomingRoutine[]> {
  return allAs(`SELECT * FROM grooming_routines ORDER BY active DESC, id DESC`, [], ['active']);
}

export function addRoutine(input: {
  title: string;
  kind?: GroomingRoutine['kind'];
  timeOfDay?: string | null;
  scheduleDays?: string | null;
  notes?: string | null;
}): Promise<number> {
  return insert(
    `INSERT INTO grooming_routines (title, kind, time_of_day, schedule_days, notes) VALUES (?, ?, ?, ?, ?)`,
    input.title.trim(),
    input.kind ?? 'skincare',
    input.timeOfDay ?? null,
    input.scheduleDays ?? null,
    input.notes ?? null,
  );
}

export const deleteRoutine = (id: number) => deleteById('grooming_routines', id);
