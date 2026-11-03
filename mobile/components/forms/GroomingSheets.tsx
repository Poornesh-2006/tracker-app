import { useEffect, useState } from 'react';
import { Chips, Field, Segmented, Sheet, toast } from '@/components/ui';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { bumpData } from '@/hooks/useDataVersion';
import { addRoutine, deleteRoutine } from '@/services/grooming-service';
import { addWardrobeItem, deleteWardrobeItem, updateWardrobeItem } from '@/services/wardrobe-service';
import type { GroomingRoutine, WardrobeCategory, WardrobeItem } from '@/types';
import { confirmDestructive } from '@/utils/confirm';
import { ErrorText, FormFooter, PhotoField } from './FormParts';

export const WARDROBE_CATEGORIES: { value: WardrobeCategory; label: string }[] = [
  { value: 'tops', label: 'Tops' },
  { value: 'pants', label: 'Pants' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'accessories', label: 'Accessories' },
];

export function WardrobeSheet({ open, onClose, entry, category }: { open: boolean; onClose: () => void; entry?: WardrobeItem | null; category?: WardrobeCategory }) {
  const blank = { category: category ?? ('tops' as WardrobeCategory), name: '', color: '', brand: '', notes: '', photoUri: null as string | null, favorite: false };
  const [form, setForm] = useState(blank);
  const { busy, error, setError, run } = useAsyncAction();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      entry
        ? { category: entry.category, name: entry.name, color: entry.color ?? '', brand: entry.brand ?? '', notes: entry.notes ?? '', photoUri: entry.photoUri, favorite: entry.favorite }
        : { ...blank, category: category ?? 'tops' },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry, category, setError]);

  const save = () =>
    run(async () => {
      if (!form.name.trim()) throw new Error('Name the item.');
      const input = { ...form, name: form.name.trim(), color: form.color.trim() || null, brand: form.brand.trim() || null, notes: form.notes.trim() || null };
      if (entry) await updateWardrobeItem(entry.id, input);
      else await addWardrobeItem(input);
      bumpData();
      toast(entry ? 'Item updated' : 'Added to wardrobe', 'hanger');
      onClose();
    });

  const remove = () =>
    entry &&
    confirmDestructive('Remove item?', `"${entry.name}" will be removed from your wardrobe.`, () =>
      run(async () => {
        await deleteWardrobeItem(entry.id);
        bumpData();
        onClose();
      }),
    );

  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Edit item' : 'Add to wardrobe'} footer={<FormFooter editing={!!entry} saveLabel="Add item" onSave={save} onDelete={remove} busy={busy} />}>
      <Chips options={WARDROBE_CATEGORIES} value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} />
      <Field label="Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="White oxford shirt" autoFocus={!entry} />
      <Field label="Color" value={form.color} onChangeText={(v) => setForm((f) => ({ ...f, color: v }))} placeholder="White" />
      <Field label="Brand" value={form.brand} onChangeText={(v) => setForm((f) => ({ ...f, brand: v }))} />
      <Field label="Notes" value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} multiline />
      <PhotoField uri={form.photoUri} onChange={(photoUri) => setForm((f) => ({ ...f, photoUri }))} camera />
      <ErrorText error={error} />
    </Sheet>
  );
}

const KINDS = [
  { value: 'skincare' as const, label: 'Skincare' },
  { value: 'grooming' as const, label: 'Grooming' },
  { value: 'schedule' as const, label: 'Schedule' },
];
const TIMES = ['Morning', 'Afternoon', 'Evening', 'Night'].map((t) => ({ value: t, label: t }));

export function RoutineSheet({ open, onClose, kind }: { open: boolean; onClose: () => void; kind: GroomingRoutine['kind'] }) {
  const [form, setForm] = useState({ title: '', kind, timeOfDay: 'Morning', scheduleDays: '', notes: '' });
  const { busy, error, setError, run } = useAsyncAction();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({ title: '', kind, timeOfDay: 'Morning', scheduleDays: '', notes: '' });
  }, [open, kind, setError]);

  const save = () =>
    run(async () => {
      if (!form.title.trim()) throw new Error('Name the routine.');
      await addRoutine({ ...form, scheduleDays: form.scheduleDays.trim() || null, notes: form.notes.trim() || null });
      bumpData();
      toast('Routine added', 'spray-bottle');
      onClose();
    });

  return (
    <Sheet open={open} onClose={onClose} title="New routine" footer={<FormFooter editing={false} saveLabel="Add routine" onSave={save} busy={busy} />}>
      <Segmented options={KINDS} value={form.kind} onChange={(v) => setForm((f) => ({ ...f, kind: v }))} />
      <Field label="Routine" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Cleanser → serum → SPF" autoFocus />
      <Chips options={TIMES} value={form.timeOfDay} onChange={(v) => setForm((f) => ({ ...f, timeOfDay: v }))} />
      <Field label="Days" value={form.scheduleDays} onChangeText={(v) => setForm((f) => ({ ...f, scheduleDays: v }))} placeholder="Daily, or Mon · Wed · Fri" />
      <Field label="Notes" value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} multiline />
      <ErrorText error={error} />
    </Sheet>
  );
}

/** Long-press delete for routines (they have no edit form). */
export const confirmDeleteRoutine = (r: GroomingRoutine) =>
  confirmDestructive('Delete routine?', `"${r.title}" will be removed.`, async () => {
    await deleteRoutine(r.id);
    bumpData();
  });
