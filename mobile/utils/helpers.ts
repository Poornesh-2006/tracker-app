export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Mean, or null for an empty list. */
export function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function matchesSearch(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.toLowerCase().includes(q);
}

/** User-facing message from an unknown thrown value. */
export function errorMessage(e: unknown, fallback = 'Something went wrong.'): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/** Sum that ignores null/undefined. */
export const sum = (xs: (number | null | undefined)[]): number => xs.reduce<number>((s, x) => s + (x ?? 0), 0);

/**
 * Parses a number typed by a person. "" -> null; otherwise a number or NaN.
 * A single comma followed by 1–2 digits is a decimal comma ("7,5" -> 7.5);
 * any other commas are thousands separators ("1,500" / "1,23,456").
 */
export function parseNum(s: string): number | null {
  const t = s.trim().replace(/\s+/g, '');
  if (t === '') return null;
  const normalized = /^-?\d+,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '');
  return normalized === '' ? Number.NaN : Number(normalized);
}
