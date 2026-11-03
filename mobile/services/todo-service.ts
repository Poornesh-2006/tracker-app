import { allAs, bool, deleteById, insert, run } from './db';
import type { TodoItem } from '@/types';

export function listTodos(): Promise<TodoItem[]> {
  return allAs<TodoItem>(`SELECT * FROM todos ORDER BY done ASC, id DESC`, [], ['done']);
}

export function addTodo(title: string, category = 'general', dueDate?: string | null): Promise<number> {
  return insert(
    `INSERT INTO todos (title, category, due_date) VALUES (?, ?, ?)`,
    title.trim(),
    category,
    dueDate ?? null,
  );
}

export async function setTodoDone(id: number, done: boolean): Promise<void> {
  await run(`UPDATE todos SET done = ? WHERE id = ?`, bool(done), id);
}

export const deleteTodo = (id: number) => deleteById('todos', id);
