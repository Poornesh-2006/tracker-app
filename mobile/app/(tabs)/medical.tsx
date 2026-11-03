import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
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

import { Screen } from '@/components/Screen';
import { AlertBanner } from '@/components/AlertBanner';
import { TrendChart } from '@/components/TrendChart';
import { EmptyState } from '@/components/EmptyState';
import { DateField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import { computeAlerts, getTestTypeDef, TEST_TYPES } from '@/constants/metrics';
import { matchesSearch } from '@/utils/helpers';
import { useDataStore } from '@/stores/data';
import { addBloodTest, deleteBloodTest, listBloodTestsByType, updateBloodTest } from '@/services/blood-test-service';
import { palette } from '@/constants/theme';
import type { BloodTest, BloodTestInput } from '@/types';
import { formatDate, shortDate, todayStr } from '@/utils/dates';

export default function MedicalScreen() {
  const theme = useTheme();
  const bloodTests = useDataStore((s) => s.bloodTests);
  const reloadBloodTests = useDataStore((s) => s.reloadBloodTests);

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<BloodTest | null>(null);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>(TEST_TYPES[0].label);
  const [typeData, setTypeData] = useState<BloodTest[]>([]);

  useFocusEffect(
    useCallback(() => {
      reloadBloodTests();
    }, [reloadBloodTests]),
  );

  useEffect(() => {
    listBloodTestsByType(selectedType).then(setTypeData).catch(() => setTypeData([]));
  }, [selectedType]);

  const filtered = useMemo(
    () =>
      bloodTests.filter(
        (t) =>
          matchesSearch(t.testType, query) ||
          matchesSearch(t.date, query) ||
          matchesSearch(String(t.value), query) ||
          matchesSearch(t.notes ?? '', query),
      ),
    [bloodTests, query],
  );

  const alerts = computeAlerts(
    bloodTests.map((t) => ({ testType: t.testType, value: t.value, unit: t.unit, date: t.date })),
  );

  const remove = async (id: number) => {
    await deleteBloodTest(id);
    await reloadBloodTests();
    setTypeData((prev) => prev.filter((t) => t.id !== id));
  };

  const visibleTypes = TEST_TYPES.filter((t) =>
    bloodTests.some((b) => b.testType === t.label),
  );
  const typeList = visibleTypes.length > 0 ? visibleTypes : TEST_TYPES;

  return (
    <Screen
      title="Blood Tests"
      subtitle="Encrypted at rest"
      action={
        <Button
          mode="contained"
          compact
          buttonColor={palette.vermillion}
          textColor="#fff"
          style={{ borderRadius: 999 }}
          onPress={() => {
            setEditing(null);
            setShowAdd(true);
          }}>
          Add test
        </Button>
      }>
      <Searchbar
        placeholder="Search by type, date, or value"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />

      <AlertBanner alerts={alerts} />

      <View style={styles.section}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Trend
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {typeList.map((t) => {
            const active = t.label === selectedType;
            return (
              <Chip
                key={t.label}
                selected={active}
                onPress={() => setSelectedType(t.label)}
                style={styles.chip}
                showSelectedCheck={false}>
                {t.label}
              </Chip>
            );
          })}
        </ScrollView>
        <TrendChart
          data={typeData.map((t) => ({ value: t.value, label: shortDate(t.date) }))}
          color={palette.vermillion}
          yLabelSuffix={typeData[0] ? ` ${typeData[0].unit}` : ''}
          area
        />
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          History
        </Text>
        {filtered.length === 0 ? (
          <EmptyState
            icon="flask-outline"
            title={query ? 'No matching tests' : 'No blood tests yet'}
            message={
              query
                ? 'Try a different search.'
                : 'Log your first lab result — values are encrypted before they touch the database.'
            }
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((t) => (
              <Card
                key={t.id}
                style={[styles.item, { backgroundColor: theme.colors.surface }]}
                onPress={() => {
                  setEditing(t);
                  setShowAdd(true);
                }}>
                <Card.Content style={styles.itemContent}>
                  <View style={[styles.itemIcon, { backgroundColor: theme.colors.primary + '22' }]}>
                    <MaterialCommunityIcons name="needle" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.itemText}>
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
                      {t.testType}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatDate(t.date)}
                      {t.notes ? ` · ${t.notes.slice(0, 40)}${t.notes.length > 40 ? '…' : ''}` : ''}
                    </Text>
                  </View>
                  <View style={styles.itemValue}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                      {t.value} <Text variant="bodySmall">{t.unit}</Text>
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                    onPress={() => remove(t.id)}
                    style={styles.delete}
                  />
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      </View>

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
    </Screen>
  );
}

interface AddBloodTestModalProps {
  visible: boolean;
  initial: BloodTest | null;
  onDismiss: () => void;
  onSaved: () => void;
}

function AddBloodTestModal({ visible, initial, onDismiss, onSaved }: AddBloodTestModalProps) {
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
    if (visible) {
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
    }
  }, [visible, initial]);

  const selectType = (label: string) => {
    setTestType(label);
    const def = getTestTypeDef(label);
    setUnit((prev) => (prev === '' || !initial ? def.unit : prev));
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Camera permission required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const save = async () => {
    if (!value) {
      setError('Enter a test value.');
      return;
    }
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      setError('Test value must be a number.');
      return;
    }
    setBusy(true);
    const input: BloodTestInput = {
      date,
      testType,
      value: parsedValue,
      unit: unit || getTestTypeDef(testType).unit,
      notes: notes || null,
      photoUri,
      source: photoUri ? 'photo' : 'manual',
    };
    if (initial) {
      await updateBloodTest(initial.id, input);
    } else {
      await addBloodTest(input);
    }
    setBusy(false);
    onSaved();
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {initial ? 'Edit blood test' : 'Add blood test'}
      </Text>
      <DateField value={date} onChange={setDate} maximumDate={new Date()} />

      <Text variant="labelMedium" style={styles.fieldLabel}>
        Test type
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {TEST_TYPES.map((t) => {
          const active = t.label === testType;
          return (
            <Chip
              key={t.label}
              selected={active}
              onPress={() => selectType(t.label)}
              style={styles.chip}
              showSelectedCheck={false}>
              {t.label}
            </Chip>
          );
        })}
      </ScrollView>

      <View style={styles.valueRow}>
        <View style={styles.valueField}>
          <NumberField label="Value" value={value} onChange={setValue} decimal />
        </View>
        <View style={styles.unitField}>
          <TextInput
            mode="outlined"
            label="Unit"
            value={unit}
            onChangeText={setUnit}
            style={styles.field}
          />
        </View>
      </View>

      <TextInput
        mode="outlined"
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={styles.field}
      />

      <View style={styles.photoRow}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty, { borderColor: theme.colors.outlineVariant }]}>
            <MaterialCommunityIcons name="image-outline" size={22} color={theme.colors.onSurfaceVariant} />
          </View>
        )}
        <View style={styles.photoButtons}>
          <Button mode="outlined" compact icon="image" onPress={pickPhoto}>
            Gallery
          </Button>
          <Button mode="outlined" compact icon="camera" onPress={takePhoto}>
            Camera
          </Button>
          {photoUri ? (
            <Button mode="text" compact onPress={() => setPhotoUri(null)}>
              Remove
            </Button>
          ) : null}
        </View>
      </View>

      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>

      <View style={styles.modalActions}>
        <Button mode="text" onPress={onDismiss}>
          Cancel
        </Button>
        <Button mode="contained" onPress={save} loading={busy} disabled={busy || !value}>
          {initial ? 'Update' : 'Save'}
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  search: { marginTop: 4, marginBottom: 8, borderRadius: 12, elevation: 0 },
  section: { marginTop: 20 },
  chips: { gap: 8, paddingVertical: 4 },
  chip: { alignSelf: 'flex-start' },
  list: { gap: 8, marginTop: 8 },
  item: { borderRadius: 14, elevation: 1 },
  itemContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemText: { flex: 1 },
  itemValue: { marginLeft: 8, alignItems: 'flex-end' },
  delete: { marginLeft: 10 },
  modal: { margin: 24, borderRadius: 18, padding: 20, maxHeight: '88%' },
  fieldLabel: { marginTop: 12, marginBottom: 4, opacity: 0.8 },
  field: { marginTop: 10 },
  valueRow: { flexDirection: 'row', gap: 10 },
  valueField: { flex: 1 },
  unitField: { flex: 1 },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  thumbEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 },
});
