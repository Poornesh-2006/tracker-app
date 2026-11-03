import { assertDate, todayStr } from '@/utils/dates';
import { parseNum } from '@/utils/helpers';

/**
 * Pure model for SchemaSheet forms: field specs, defaults and parsing/validation.
 * Kept free of UI imports so it can be unit-tested and reused.
 */
export type FieldSpec =
  | { key: string; label: string; kind: 'text'; required?: boolean; placeholder?: string; multiline?: boolean; caps?: 'none' | 'sentences' | 'words' }
  | { key: string; label: string; kind: 'number'; required?: boolean; min?: number; max?: number; integer?: boolean; suffix?: string; placeholder?: string }
  | { key: string; label: string; kind: 'date'; optional?: boolean }
  | { key: string; label: string; kind: 'choice'; options: readonly { value: string; label: string }[]; segmented?: boolean };

export type FormValues = Record<string, string | number | null>;

/** Two fields side by side: pass a tuple. */
export type FormLayout = (FieldSpec | [FieldSpec, FieldSpec])[];

export function initialValue(f: FieldSpec): string {
  if (f.kind === 'date') return f.optional ? '' : todayStr();
  if (f.kind === 'choice') return f.options[0]?.value ?? '';
  return '';
}

export function flatten(layout: FormLayout): FieldSpec[] {
  return layout.flatMap((x) => (Array.isArray(x) ? x : [x]));
}

/** Validates and converts raw strings; throws a user-facing message on the first problem. */
export function parseValues(fields: FieldSpec[], raw: Record<string, string>): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    const v = (raw[f.key] ?? '').trim();
    if (f.kind === 'number') {
      const n = parseNum(v);
      if (n == null) {
        if (f.required) throw new Error(`${f.label} is required.`);
        out[f.key] = null;
        continue;
      }
      if (!Number.isFinite(n)) throw new Error(`${f.label} must be a number.`);
      if (f.integer && !Number.isInteger(n)) throw new Error(`${f.label} must be a whole number.`);
      if (f.min != null && n < f.min) throw new Error(`${f.label} must be at least ${f.min}.`);
      if (f.max != null && n > f.max) throw new Error(`${f.label} can’t exceed ${f.max}.`);
      out[f.key] = n;
    } else if (f.kind === 'text') {
      if (!v && f.required) throw new Error(`${f.label} is required.`);
      out[f.key] = v || null;
    } else if (f.kind === 'date') {
      if (!v) {
        if (!f.optional) throw new Error(`${f.label} is required.`);
        out[f.key] = null;
        continue;
      }
      out[f.key] = assertDate(v, f.label);
    } else {
      out[f.key] = v || null;
    }
  }
  return out;
}


/** Typed readers for FormValues. */
export const text = (v: FormValues, k: string) => (v[k] == null ? null : String(v[k]));
export const num = (v: FormValues, k: string) => (typeof v[k] === 'number' ? (v[k] as number) : null);
