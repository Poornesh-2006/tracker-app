import { allAs, bool, deleteById, insert, run } from './db';
import type { WardrobeCategory, WardrobeItem, WardrobeItemInput } from '@/types';

const BOOLS = ['favorite'] as const;
const params = (i: WardrobeItemInput) =>
  [i.category, i.name, i.photoUri ?? null, i.color ?? null, i.brand ?? null, i.notes ?? null, bool(i.favorite)] as const;

export function addWardrobeItem(input: WardrobeItemInput): Promise<number> {
  return insert(
    `INSERT INTO wardrobe_items (category, name, photo_uri, color, brand, notes, favorite) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ...params(input),
  );
}

export function listWardrobe(category?: WardrobeCategory): Promise<WardrobeItem[]> {
  return category
    ? allAs(`SELECT * FROM wardrobe_items WHERE category = ? ORDER BY favorite DESC, id DESC`, [category], BOOLS)
    : allAs(`SELECT * FROM wardrobe_items ORDER BY favorite DESC, id DESC`, [], BOOLS);
}

export async function updateWardrobeItem(id: number, input: WardrobeItemInput): Promise<void> {
  await run(
    `UPDATE wardrobe_items SET category = ?, name = ?, photo_uri = ?, color = ?, brand = ?, notes = ?, favorite = ?
     WHERE id = ?`,
    ...params(input),
    id,
  );
}

export const deleteWardrobeItem = (id: number) => deleteById('wardrobe_items', id);
