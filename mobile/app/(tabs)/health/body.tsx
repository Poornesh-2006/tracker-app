import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  HelperText,
  Modal,
  Portal,
  Searchbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { GlassCard } from '@/components/GlassCard';
import { BodyMap } from '@/components/BodyMap';
import { AlertBanner } from '@/components/AlertBanner';
import { TrendChart } from '@/components/TrendChart';
import { EmptyState } from '@/components/EmptyState';
import { DateField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import { computeAlerts, getTestTypeDef, TEST_TYPES } from '@/constants/metrics';
import {
  BODY_REGIONS,
  REGION_STATUS_COLORS,
  REGION_STATUS_LABELS,
  getRegion,
  summarizeRegions,
  type RegionId,
  type RegionStatus,
} from '@/constants/body-map';
import { matchesSearch } from '@/utils/helpers';
import { useDataStore } from '@/stores/data';
import { addBloodTest, deleteBloodTest, listBloodTestsByType, updateBloodTest } from '@/services/blood-test-service';
import { palette, radii } from '@/constants/theme';
import type { BloodTest, BloodTestInput } from '@/types';
import { formatDate, shortDate, todayStr } from '@/utils/dates';

export default function BodyReportsScreen() {
  const theme = useTheme();
  const bloodTests = useDataStore((s) => s.bloodTests);
  const reloadBloodTests = useDataStore((s) => s.reloadBloodTests);

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<BloodTest | null>(null);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>(TEST_TYPES[0].label);
  const [typeData, setTypeData] = useState<BloodTest[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionId | null>(null);

  useFocusEffect(
    useCallback(() => {
      reloadBloodTests();
    }, [reloadBloodTests]),
  );

  useEffect(() => {
    listBloodTestsByType(selectedType).then(setTypeData).catch(() => setTypeData([]));
  }, [selectedType]);

  const regionSummaries = useMemo(
    () =>
      summarizeRegions(
        bloodTests.map((t) => ({
          testType: t.testType,
          value: t.value,
          unit: t.unit,
          date: t.date,
        })),
      ),
    [bloodTests],
  );

  const regionStatuses = useMemo(() => {
    const out = {} as Record<RegionId, RegionStatus>;
    for (const region of BODY_REGIONS) {
      out[region.id] = regionSummaries[region.id].status;
    }
    return out;
  }, [regionSummaries]);

  const activeRegion = selectedRegion ? getRegion(selectedRegion) : null;
  const activeSummary = selectedRegion ? regionSummaries[selectedRegion] : null;

  const filtered = useMemo(
    () =>
      bloodTests.filter((t) => {
        if (activeRegion && !activeRegion.tests.includes(t.testType)) return false;
        return (
          matchesSearch(t.testType, query) ||
          matchesSearch(t.date, query) ||
          matchesSearch(String(t.value), query)
        );
      }),
    [bloodTests, query, activeRegion],
  );

  const alerts = computeAlerts(
    bloodTests.map((t) => ({ testType: t.testType, value: t.value, unit: t.unit, date: t.date })),
  );

  const remove = async (id: number) => {
    await deleteBloodTest(id);
    await reloadBloodTests();
    setTypeData((prev) => prev.filter((t) => t.id !== id));
  };

  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <GlassCard contentStyle={styles.mapHero}>
        <View style={styles.mapRow}>
          <BodyMap
            statuses={regionStatuses}
            selected={selectedRegion}
            onSelect={(id) => setSelectedRegion((prev) => (prev === id ? null : id))}
            width={158}
          />
          <View style={styles.legend}>
            <Text style={[styles.heroTitle, { color: ink }]}>Body map</Text>
            <Text style={[styles.heroSub, { color: muted }]}>
              Tap a region to see the labs behind it.
            </Text>
            {(['ok', 'low', 'high', 'none'] as RegionStatus[]).map((s) => (
              <View key={s} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: REGION_STATUS_COLORS[s] }]} />
                <Text style={[styles.legendLabel, { color: muted }]}>
                  {REGION_STATUS_LABELS[s]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </GlassCard>

      {activeRegion && activeSummary ? (
        <GlassCard style={styles.regionCard} contentStyle={styles.regionContent}>
          <View style={styles.regionHeader}>
            <View
              style={[
                styles.regionDot,
                { backgroundColor: REGION_STATUS_COLORS[activeSummary.status] },
              ]}
            />
            <Text style={[styles.regionName, { color: ink }]}>{activeRegion.name}</Text>
            <View style={{ flex: 1 }} />
            <Button compact mode="text" textColor={muted} onPress={() => setSelectedRegion(null)}>
              Clear
            </Button>
          </View>
          <Text style={[styles.regionBlurb, { color: muted }]}>{activeRegion.blurb}</Text>
          {activeSummary.tests.length === 0 ? (
            <Text style={[styles.regionEmpty, { color: muted }]}>
              No labs logged for this region yet. Add a test to light it up.
            </Text>
          ) : (
            <View style={styles.regionTests}>
              {activeSummary.tests.map((p) => (
                <View key={p.testType} style={styles.regionTestRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: ink, fontWeight: '700' }}>{p.testType}</Text>
                    <Text style={{ color: muted, fontSize: 12 }}>
                      {p.value} {p.unit} · {formatDate(p.date)}
                    </Text>
                  </View>
                  <Chip
                    compact
                    style={styles.statusChip}
                    textStyle={{ color: REGION_STATUS_COLORS[p.status], fontSize: 11 }}>
                    {REGION_STATUS_LABELS[p.status]}
                  </Chip>
                  <Button
                    compact
                    mode="text"
                    textColor={palette.vermillion}
                    onPress={() => setSelectedType(p.testType)}>
                    Trend
                  </Button>
                </View>
              ))}
            </View>
          )}
        </GlassCard>
      ) : null}

      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: ink }]}>Blood tests</Text>
        <Button
          mode="contained"
          compact
          buttonColor={palette.vermillion}
          textColor="#fff"
          style={{ borderRadius: radii.pill }}
          onPress={() => {
            setEditing(null);
            setShowAdd(true);
          }}>
          Add test
        </Button>
      </View>

      <Searchbar
        placeholder="Search labs"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />

      <AlertBanner alerts={alerts} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {TEST_TYPES.map((t) => (
          <Chip
            key={t.label}
            selected={t.label === selectedType}
            onPress={() => setSelectedType(t.label)}
            showSelectedCheck={false}
            style={styles.chip}>
            {t.label}
          </Chip>
        ))}
      </ScrollView>

      <TrendChart
        data={typeData.map((t) => ({ value: t.value, label: shortDate(t.date) }))}
        color={palette.vermillion}
        yLabelSuffix={typeData[0] ? ` ${typeData[0].unit}` : ''}
        area
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon="flask-outline"
          title={
            activeRegion
              ? `No labs for ${activeRegion.name}`
              : query
                ? 'No matching labs'
                : 'No labs yet'
          }
          message={
            activeRegion
              ? 'Log one of the panels this region tracks, or clear the region filter.'
              : query
                ? 'Try a different test name, date or value.'
                : 'Add your first encrypted blood test.'
          }
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((t) => (
            <GlassCard
              key={t.id}
              contentStyle={styles.item}
              style={{ marginBottom: 8 }}>
              <PressableRow
                onPress={() => {
                  setEditing(t);
                  setShowAdd(true);
                }}
                onDelete={() => remove(t.id)}
                title={t.testType}
                subtitle={`${formatDate(t.date)}`}
                value={`${t.value} ${t.unit}`}
              />
            </GlassCard>
          ))}
        </View>
      )}

      <Portal>
        <AddBloodTestModal
          visible={showAdd}
          initial={editing}
          onDismiss={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowAdd(false);
            setEditing(null);
            reloadBloodTests();
            listBloodTestsByType(selectedType).then(setTypeData);
          }}
        />
      </Portal>
    </ScrollView>
  );
}

function PressableRow({
  title,
  subtitle,
  value,
  onPress,
  onDelete,
}: {
  title: string;
  subtitle: string;
  value: string;
  onPress: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.itemRow}>
      <View style={{ flex: 1 }} onTouchEnd={onPress}>
        <Text style={{ color: theme.colors.onSurface, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>{subtitle}</Text>
      </View>
      <Text style={{ color: theme.colors.onSurface, fontWeight: '800', marginRight: 10 }}>{value}</Text>
      <MaterialCommunityIcons
        name="delete-outline"
        size={20}
        color={theme.colors.onSurfaceVariant}
        onPress={onDelete}
      />
    </View>
  );
}

function AddBloodTestModal({
  visible,
  initial,
  onDismiss,
  onSaved,
}: {
  visible: boolean;
  initial: BloodTest | null;
  onDismiss: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [date, setDate] = useState(todayStr());
  const [testType, setTestType] = useState(TEST_TYPES[0].label);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setDate(initial.date);
      setTestType(initial.testType);
      setValue(String(initial.value));
      setUnit(initial.unit);
      setNotes(initial.notes ?? '');
      setPhotoUri(initial.photoUri);
    } else {
      setDate(todayStr());
      setTestType(TEST_TYPES[0].label);
      setValue('');
      setUnit(TEST_TYPES[0].unit);
      setNotes('');
      setPhotoUri(null);
    }
    setError('');
  }, [visible, initial]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const save = async () => {
    if (!value) {
      setError('Enter a value');
      return;
    }
    setBusy(true);
    const input: BloodTestInput = {
      date,
      testType,
      value: Number(value),
      unit: unit || getTestTypeDef(testType).unit,
      notes: notes || null,
      photoUri,
      source: photoUri ? 'photo' : 'manual',
    };
    if (initial) await updateBloodTest(initial.id, input);
    else await addBloodTest(input);
    setBusy(false);
    onSaved();
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text style={{ fontWeight: '800', fontSize: 18, color: theme.colors.onSurface }}>
        {initial ? 'Edit lab' : 'Add lab'}
      </Text>
      <DateField value={date} onChange={setDate} maximumDate={new Date()} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {TEST_TYPES.map((t) => (
          <Chip
            key={t.label}
            selected={t.label === testType}
            onPress={() => {
              setTestType(t.label);
              setUnit(t.unit);
            }}
            showSelectedCheck={false}>
            {t.label}
          </Chip>
        ))}
      </ScrollView>
      <NumberField label="Value" value={value} onChange={setValue} decimal />
      <TextInput mode="outlined" label="Unit" value={unit} onChangeText={setUnit} style={{ marginTop: 8 }} />
      <TextInput mode="outlined" label="Notes" value={notes} onChangeText={setNotes} style={{ marginTop: 8 }} />
      <View style={styles.photoRow}>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.thumb} /> : null}
        <Button mode="outlined" onPress={pickPhoto}>
          Photo
        </Button>
      </View>
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
      <View style={styles.modalActions}>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button mode="contained" buttonColor={palette.vermillion} textColor="#fff" loading={busy} onPress={save}>
          Save
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120 },
  mapHero: { paddingVertical: 12 },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  legend: { flex: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { fontSize: 12, fontWeight: '600' },
  regionCard: { marginTop: 14 },
  regionContent: { paddingVertical: 12 },
  regionHeader: { flexDirection: 'row', alignItems: 'center' },
  regionDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  regionName: { fontSize: 17, fontWeight: '800' },
  regionBlurb: { fontSize: 12.5, marginTop: 4, lineHeight: 17 },
  regionEmpty: { fontSize: 12.5, marginTop: 10, fontStyle: 'italic' },
  regionTests: { marginTop: 6 },
  regionTestRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  statusChip: { height: 26, backgroundColor: 'transparent' },
  heroTitle: { fontSize: 20, fontWeight: '800' },
  heroSub: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  search: { marginBottom: 10, borderRadius: 14, elevation: 0 },
  chips: { gap: 8, paddingVertical: 8 },
  chip: { alignSelf: 'flex-start' },
  list: { marginTop: 8 },
  item: { paddingVertical: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  modal: { margin: 20, borderRadius: radii.xl, padding: 18, maxHeight: '88%' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
});
