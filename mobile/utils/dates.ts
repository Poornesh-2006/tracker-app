/**
 * Local-calendar date helpers. Dates are stored as local "YYYY-MM-DD" strings
 * everywhere (DB, sync, UI), never as UTC ISO strings, so "today" matches the
 * user's wall clock.
 */

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

/** Local YYYY-MM-DD for n days before today. */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

/** Parses "YYYY-MM-DD" as a local date (new Date("YYYY-MM-DD") would be UTC). */
export function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(dateStr: string): string {
  return parseDateStr(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
}

/** "YYYY-MM-DD" shifted by n days (local calendar). */
export function addDays(date: string, n: number): string {
  const d = parseDateStr(date);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** The n days ending at `end` (inclusive), oldest first. */
export function lastNDays(n: number, end: string = todayStr()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

/** One-letter weekday ("M") for chart labels. */
export const weekdayNarrow = (date: string) => parseDateStr(date).toLocaleDateString('en-US', { weekday: 'narrow' });

/** Strict local date check: right shape AND a real calendar day (rejects 2026-02-30). */
export function isValidDateStr(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && toDateStr(parseDateStr(s)) === s;
}

export function assertDate(s: string | null | undefined, label = 'Date'): string {
  if (!isValidDateStr(s)) throw new Error(`${label} must be a real date (YYYY-MM-DD).`);
  return s;
}
