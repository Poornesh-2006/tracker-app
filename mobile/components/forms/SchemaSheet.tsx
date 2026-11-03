import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Chips, DateField, Field, NumberField, Segmented, Sheet, parseNum, toast, type IconName } from '@/components/ui';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { bumpData } from '@/hooks/useDataVersion';
import { confirmDestructive } from '@/utils/confirm';
import { todayStr } from '@/utils/dates';
import { ErrorText, FormFooter } from './FormParts';

/**
 * Declarative add-form for simple records (media, skills, marks, money…).
 * Describe fields once; the sheet handles state, trimming, number parsing,
 * validation, busy/error, toast and refreshing screens.
 */
export type FieldSpec =
  | { key: string; label: string; kind: 'text'; required?: boolean; placeholder?: string; multiline?: boolean; caps?: 'none' | 'sentences' | 'words' }
  | { key: string; label: string; kind: 'number'; required?: boolean; min?: number; max?: number; integer?: boolean; suffix?: string; placeholder?: string }
  | { key: string; label: string; kind: 'date'; optional?: boolean }
  | { key: string; label: string; kind: 'choice'; options: readonly { value: string; label: string }[]; segmented?: boolean };

export type FormValues = Record<string, string | number | null>;

/** Two fields side by side: pass a tuple. */
export type FormLayout = (FieldSpec | [FieldSpec, FieldSpec])[];

function initialValue(f: FieldSpec): string {
  if (f.kind === 'date') return f.optional ? '' : todayStr();
  if (f.kind === 'choice') return f.options[0]?.value ?? '';
  return '';
}

function flatten(layout: FormLayout): FieldSpec[] {
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
    } else {
      out[f.key] = v || null;
    }
  }
  return out;
}

export function SchemaSheet({
  open,
  onClose,
  title,
  fields,
  submitLabel,
  onSubmit,
  successMessage,
  successIcon = 'check-circle',
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FormLayout;
  submitLabel: string;
  onSubmit: (values: FormValues) => Promise<unknown>;
  successMessage: string;
  successIcon?: IconName;
  /** Prefill values (raw strings), e.g. a selected category. */
  defaults?: Record<string, string>;
}) {
  const flat = flatten(fields);
  const [raw, setRaw] = useState<Record<string, string>>({});
  const { busy, error, setError, run } = useAsyncAction();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setRaw({ ...Object.fromEntries(flat.map((f) => [f.key, initialValue(f)])), ...defaults });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (key: string) => (v: string) => setRaw((r) => ({ ...r, [key]: v }));

  const save = () =>
    run(async () => {
      await onSubmit(parseValues(flat, raw));
      bumpData();
      toast(successMessage, successIcon);
      onClose();
    });

  const render = (f: FieldSpec, first: boolean) => {
    const value = raw[f.key] ?? '';
    switch (f.kind) {
      case 'text':
        return <Field key={f.key} label={f.label} value={value} onChangeText={set(f.key)} placeholder={f.placeholder} multiline={f.multiline} autoCapitalize={f.caps} autoFocus={first} />;
      case 'number':
        return <NumberField key={f.key} label={f.label} value={value} onChangeText={set(f.key)} suffix={f.suffix} integer={f.integer} placeholder={f.placeholder} />;
      case 'date':
        return value || !f.optional ? (
          <DateField key={f.key} label={f.label} value={value || todayStr()} onChange={set(f.key)} />
        ) : (
          <Chips key={f.key} options={[{ value: 'add', label: `+ ${f.label}` }]} value={null} onChange={() => set(f.key)(todayStr())} />
        );
      case 'choice':
        return f.segmented ? (
          <Segmented key={f.key} options={f.options} value={value} onChange={set(f.key)} />
        ) : (
          <Chips key={f.key} options={f.options} value={value} onChange={set(f.key)} />
        );
    }
  };

  let firstText = true;
  const isFirst = (f: FieldSpec) => {
    const yes = firstText && f.kind === 'text';
    if (yes) firstText = false;
    return yes;
  };

  return (
    <Sheet open={open} onClose={onClose} title={title} footer={<FormFooter editing={false} saveLabel={submitLabel} onSave={save} busy={busy} />}>
      {fields.map((x, i) =>
        Array.isArray(x) ? (
          <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
            {x.map((f) => (
              <View key={f.key} style={{ flex: 1 }}>
                {render(f, isFirst(f))}
              </View>
            ))}
          </View>
        ) : (
          render(x, isFirst(x))
        ),
      )}
      <ErrorText error={error} />
    </Sheet>
  );
}

/** Confirm, delete, refresh every screen. Shared by all long-press deletes. */
export function askDelete(name: string, remove: () => Promise<unknown>): void {
  confirmDestructive(`Delete ${name}?`, 'This can’t be undone.', async () => {
    await remove();
    bumpData();
    toast('Deleted', 'delete');
  });
}

/** Typed readers for FormValues. */
export const text = (v: FormValues, k: string) => (v[k] == null ? null : String(v[k]));
export const num = (v: FormValues, k: string) => (typeof v[k] === 'number' ? (v[k] as number) : null);
