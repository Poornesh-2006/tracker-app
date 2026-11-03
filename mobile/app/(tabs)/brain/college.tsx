import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  HelperText,
  Modal,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { GlassCard } from '@/components/GlassCard';
import { EmptyState } from '@/components/EmptyState';
import { DateField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import {
  addCollegeActivity,
  deleteCollegeActivity,
  listCollegeActivities,
} from '@/services/education-service';
import { palette, radii } from '@/constants/theme';
import type { CollegeActivity } from '@/types';
import { todayStr } from '@/utils/dates';

type Kind = CollegeActivity['kind'] | 'all';

export default function CollegeScreen() {
  const theme = useTheme();
  const [kind, setKind] = useState<Kind>('all');
  const [items, setItems] = useState<CollegeActivity[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const reload = useCallback(async () => {
    setItems(await listCollegeActivities(kind === 'all' ? undefined : kind));
  }, [kind]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.pad}>
        <SegmentedButtons
          value={kind}
          onValueChange={(v) => setKind(v as Kind)}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'attendance', label: 'Attend' },
            { value: 'hackathon', label: 'Hack' },
            { value: 'schedule', label: 'Schedule' },
          ]}
        />
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: ink }]}>College life</Text>
          <Button
            mode="contained"
            compact
            buttonColor={palette.vermillion}
            textColor="#fff"
            style={{ borderRadius: radii.pill }}
            onPress={() => setShowAdd(true)}>
            Add
          </Button>
        </View>

        {items.length === 0 ? (
          <EmptyState
            icon="school-outline"
            title="Nothing logged"
            message="Track attendance, hackathons, events, and class timetable."
          />
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <GlassCard key={item.id} contentStyle={styles.item}>
                <View style={[styles.badge, { backgroundColor: palette.vermillion + '18' }]}>
                  <MaterialCommunityIcons
                    name={
                      item.kind === 'hackathon'
                        ? 'trophy-outline'
                        : item.kind === 'attendance'
                          ? 'calendar-check'
                          : item.kind === 'schedule'
                            ? 'clock-outline'
                            : 'calendar'
                    }
                    size={18}
                    color={palette.vermillion}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: ink, fontWeight: '700' }}>{item.title}</Text>
                  <Text style={{ color: muted, fontSize: 12 }}>
                    {item.kind}
                    {item.date ? ` · ${item.date}` : ''}
                    {item.status ? ` · ${item.status}` : ''}
                    {item.hours != null ? ` · ${item.hours}h` : ''}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color={muted}
                  onPress={() => deleteCollegeActivity(item.id).then(reload)}
                />
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>

      <Portal>
        <AddCollegeModal visible={showAdd} onDismiss={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); reload(); }} />
      </Portal>
    </View>
  );
}

function AddCollegeModal({
  visible,
  onDismiss,
  onSaved,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [kind, setKind] = useState<CollegeActivity['kind']>('schedule');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr());
  const [status, setStatus] = useState('');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim()) {
      setError('Enter a title');
      return;
    }
    setBusy(true);
    await addCollegeActivity({
      kind,
      title,
      date,
      status: status || null,
      hours: hours ? Number(hours) : null,
      notes: notes || null,
    });
    setBusy(false);
    setTitle('');
    onSaved();
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text style={{ fontWeight: '800', fontSize: 18 }}>Add college item</Text>
      <View style={styles.chips}>
        {(['attendance', 'hackathon', 'event', 'schedule'] as const).map((k) => (
          <Chip key={k} selected={kind === k} onPress={() => setKind(k)} showSelectedCheck={false}>
            {k}
          </Chip>
        ))}
      </View>
      <DateField value={date} onChange={setDate} />
      <TextInput mode="outlined" label="Title" value={title} onChangeText={setTitle} style={{ marginTop: 8 }} />
      <TextInput mode="outlined" label="Status (present / absent / registered)" value={status} onChangeText={setStatus} style={{ marginTop: 8 }} />
      <NumberField label="Hours (optional)" value={hours} onChange={setHours} decimal />
      <TextInput mode="outlined" label="Notes" value={notes} onChangeText={setNotes} style={{ marginTop: 8 }} />
      <HelperText type="error" visible={!!error}>{error}</HelperText>
      <View style={styles.actions}>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button mode="contained" buttonColor={palette.vermillion} textColor="#fff" loading={busy} onPress={save}>Save</Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: 16, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '800' },
  list: { gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modal: { margin: 20, borderRadius: radii.xl, padding: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
