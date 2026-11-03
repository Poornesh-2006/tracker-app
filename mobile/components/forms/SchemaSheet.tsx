import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Chips, DateField, Field, NumberField, Segmented, Sheet, toast, type IconName } from '@/components/ui';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { bumpData } from '@/hooks/useDataVersion';
import { todayStr } from '@/utils/dates';
import { flatten, initialValue, parseValues, type FieldSpec, type FormLayout, type FormValues } from './schema';
import { ErrorText, FormFooter } from './FormParts';

export { num, text, type FieldSpec, type FormLayout, type FormValues } from './schema';

/**
 * Declarative add-form for simple records (media, skills, marks, money…).
 * Describe fields once (see ./schema); the sheet handles state, parsing,
 * validation, busy/error, toast and refreshing screens.
 */
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

export { askDelete } from './actions';

