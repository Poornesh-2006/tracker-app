import { allAs, deleteById, insert } from './db';
import type { CollegeActivity, EducationMark, Skill } from '@/types';

export function listSkills(): Promise<Skill[]> {
  return allAs(`SELECT id, name, category, level, notes FROM skills ORDER BY level DESC, id DESC`);
}

export function addSkill(input: { name: string; category?: string; level?: number; notes?: string | null }) {
  return insert(
    `INSERT INTO skills (name, category, level, notes) VALUES (?, ?, ?, ?)`,
    input.name.trim(),
    input.category ?? 'general',
    input.level ?? 1,
    input.notes ?? null,
  );
}

export const deleteSkill = (id: number) => deleteById('skills', id);

export function listMarks(): Promise<EducationMark[]> {
  return allAs(
    `SELECT id, subject, exam, score, max_score, date, notes FROM education_marks ORDER BY date DESC, id DESC`,
  );
}

export function addMark(input: {
  subject: string;
  exam?: string | null;
  score: number;
  maxScore?: number;
  date?: string | null;
  notes?: string | null;
}): Promise<number> {
  return insert(
    `INSERT INTO education_marks (subject, exam, score, max_score, date, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    input.subject.trim(),
    input.exam ?? null,
    input.score,
    input.maxScore ?? 100,
    input.date ?? null,
    input.notes ?? null,
  );
}

export const deleteMark = (id: number) => deleteById('education_marks', id);

const ACTIVITY_COLS = 'id, kind, title, date, status, hours, notes';

export function listCollegeActivities(kind?: CollegeActivity['kind']): Promise<CollegeActivity[]> {
  return kind
    ? allAs(`SELECT ${ACTIVITY_COLS} FROM college_activities WHERE kind = ? ORDER BY date DESC, id DESC`, [kind])
    : allAs(`SELECT ${ACTIVITY_COLS} FROM college_activities ORDER BY date DESC, id DESC`);
}

export function addCollegeActivity(input: {
  kind: CollegeActivity['kind'];
  title: string;
  date?: string | null;
  status?: string | null;
  hours?: number | null;
  notes?: string | null;
}): Promise<number> {
  return insert(
    `INSERT INTO college_activities (kind, title, date, status, hours, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    input.kind,
    input.title.trim(),
    input.date ?? null,
    input.status ?? null,
    input.hours ?? null,
    input.notes ?? null,
  );
}

export const deleteCollegeActivity = (id: number) => deleteById('college_activities', id);
