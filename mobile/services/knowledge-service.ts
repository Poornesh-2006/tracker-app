import { allAs, bool, deleteById, insert, run } from './db';
import type { KnowledgeNode } from '@/types';

export function listKnowledgeNodes(): Promise<KnowledgeNode[]> {
  return allAs(`SELECT id, title, parent_id, learned, color, notes FROM knowledge_nodes ORDER BY id ASC`, [], [
    'learned',
  ]);
}

export function addKnowledgeNode(input: {
  title: string;
  parentId?: number | null;
  color?: string;
  notes?: string | null;
}): Promise<number> {
  return insert(
    `INSERT INTO knowledge_nodes (title, parent_id, color, notes) VALUES (?, ?, ?, ?)`,
    input.title.trim(),
    input.parentId ?? null,
    input.color ?? '#EB5E28',
    input.notes ?? null,
  );
}

export async function setNodeLearned(id: number, learned: boolean): Promise<void> {
  await run(`UPDATE knowledge_nodes SET learned = ? WHERE id = ?`, bool(learned), id);
}

/** Children at every depth are removed by the ON DELETE CASCADE foreign key. */
export const deleteKnowledgeNode = (id: number) => deleteById('knowledge_nodes', id);
