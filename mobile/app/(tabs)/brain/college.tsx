import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Card, CardHead, Chips, Empty, IconButton, ListItem, Meter, Screen, Text } from '@/components/ui';
import { SchemaSheet, askDelete, num, text, type FormLayout } from '@/components/forms/SchemaSheet';
import { space } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { addCollegeActivity, deleteCollegeActivity, listCollegeActivities } from '@/services/education-service';
import type { CollegeActivity } from '@/types';
import { formatDate } from '@/utils/dates';
import { plural } from '@/utils/helpers';

type Kind = CollegeActivity['kind'];
const KINDS = [
  { value: 'attendance' as Kind, label: 'Attendance' },
  { value: 'hackathon' as Kind, label: 'Hackathons' },
  { value: 'event' as Kind, label: 'Events' },
  { value: 'schedule' as Kind, label: 'Classes' },
];
const ICON = { attendance: 'account-check-outline', hackathon: 'laptop', event: 'party-popper', schedule: 'clock-outline' } as const;
const ATTENDANCE = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
];

function fieldsFor(kind: Kind): FormLayout {
  const base: FormLayout = [{ key: 'title', label: kind === 'attendance' ? 'Class' : 'Title', kind: 'text', required: true, caps: 'words' }];
  if (kind === 'attendance') base.push({ key: 'status', label: 'Status', kind: 'choice', segmented: true, options: ATTENDANCE });
  else base.push({ key: 'status', label: kind === 'schedule' ? 'Time / room' : 'Result / role', kind: 'text' });
  base.push([{ key: 'date', label: 'Date', kind: 'date' }, { key: 'hours', label: 'Hours', kind: 'number', min: 0, max: 72 }]);
  base.push({ key: 'notes', label: 'Notes', kind: 'text', multiline: true });
  return base;
}

export default function CollegeScreen() {
  const { data } = useFocusData(useCallback(() => listCollegeActivities(), []));
  const [kind, setKind] = useState<Kind>('attendance');
  const [adding, setAdding] = useState(false);
  const items = (data ?? []).filter((a) => a.kind === kind);
  const attended = items.filter((a) => a.status === 'present' || a.status === 'late').length;

  return (
    <Screen back eyebrow="Brain" title="College" right={<IconButton icon="plus" tone="ink" label="Add" onPress={() => setAdding(true)} />}>
      <Chips options={KINDS} value={kind} onChange={setKind} />
      {kind === 'attendance' && items.length ? (
        <Card index={0} tone="blush">
          <CardHead label={`Attendance · ${plural(items.length, 'class', 'classes')}`} icon="account-check-outline" tone="blush" />
          <Text variant="display">
            {Math.round((attended / items.length) * 100)}%
          </Text>
          <View style={{ marginTop: space.sm }}>
            <Meter progress={attended / items.length} />
          </View>
          <Text variant="small" muted style={{ marginTop: 4 }}>
            {attended < items.length * 0.75 ? 'Below 75% — watch it.' : 'On track.'}
          </Text>
        </Card>
      ) : null}
      <View style={{ gap: space.sm }}>
        {items.map((a, i) => (
          <ListItem
            key={a.id}
            index={i + 1}
            icon={ICON[a.kind]}
            iconTone={a.status === 'absent' ? 'peach' : 'blush'}
            title={a.title}
            subtitle={[a.status, a.date && formatDate(a.date), a.hours != null && `${a.hours}h`].filter(Boolean).join(' · ') || null}
            onLongPress={() => askDelete(`"${a.title}"`, () => deleteCollegeActivity(a.id))}
          />
        ))}
      </View>
      {data && !items.length ? <Empty icon={ICON[kind]} title="Nothing logged" body="Tap + to add one. Long-press to delete." /> : null}
      <SchemaSheet
        key={kind}
        open={adding}
        onClose={() => setAdding(false)}
        title={`Add ${KINDS.find((k) => k.value === kind)!.label.toLowerCase()}`}
        fields={fieldsFor(kind)}
        submitLabel="Add"
        successMessage="Saved"
        onSubmit={(v) => addCollegeActivity({ kind, title: text(v, 'title')!, status: text(v, 'status'), date: text(v, 'date'), hours: num(v, 'hours'), notes: text(v, 'notes') })}
      />
    </Screen>
  );
}
