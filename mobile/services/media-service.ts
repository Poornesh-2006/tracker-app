import { allAs, deleteById, insert, run } from './db';
import type { LearningMedia } from '@/types';

const COLS = 'id, kind, title, creator, url, status, notes';

export function listMedia(kind?: LearningMedia['kind']): Promise<LearningMedia[]> {
  return kind
    ? allAs(`SELECT ${COLS} FROM learning_media WHERE kind = ? ORDER BY id DESC`, [kind])
    : allAs(`SELECT ${COLS} FROM learning_media ORDER BY id DESC`);
}

export function addMedia(input: {
  kind: LearningMedia['kind'];
  title: string;
  creator?: string | null;
  url?: string | null;
  status?: LearningMedia['status'];
  notes?: string | null;
}): Promise<number> {
  return insert(
    `INSERT INTO learning_media (kind, title, creator, url, status, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    input.kind,
    input.title.trim(),
    input.creator ?? null,
    input.url ?? null,
    input.status ?? 'todo',
    input.notes ?? null,
  );
}

export async function setMediaStatus(id: number, status: LearningMedia['status']): Promise<void> {
  await run(`UPDATE learning_media SET status = ? WHERE id = ?`, status, id);
}

export const deleteMedia = (id: number) => deleteById('learning_media', id);
