import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { Card, CardHead, Chips, Empty, Field, IconButton, LineChart, ListItem, Screen, Section, Text } from '@/components/ui';
import { BloodTestSheet } from '@/components/forms/EntrySheets';
import { BodyMap, statusColor } from '@/components/health/BodyMap';
import { AiSheet } from '@/components/ai/AiSheet';
import { BODY_REGIONS, REGION_STATUS_LABELS, getRegion, statusForTest, summarizeRegions, type RegionId, type RegionStatus } from '@/constants/body-map';
import { getTestTypeDef } from '@/constants/metrics';
import { accent, space, useTheme } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { listBloodTests } from '@/services/blood-test-service';
import { explainBloodTest } from '@/services/gemma-api';
import type { BloodTest } from '@/types';
import { formatDate } from '@/utils/dates';
import { matchesSearch } from '@/utils/helpers';

const loadTests = () => listBloodTests(500);

export default function BodyScreen() {
  const { dark } = useTheme();
  const { width } = useWindowDimensions();
  const { data: tests, reload } = useFocusData(useCallback(loadTests, []));
  const [region, setRegion] = useState<RegionId | null>(null);
  const [trendType, setTrendType] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState<{ open: boolean; entry: BloodTest | null }>({ open: false, entry: null });
  const [explain, setExplain] = useState<BloodTest | null>(null);

  const all = useMemo(() => tests ?? [], [tests]);
  const summary = useMemo(() => summarizeRegions(all), [all]);
  const statuses = useMemo(
    () => Object.fromEntries(BODY_REGIONS.map((r) => [r.id, summary[r.id].status])) as Record<RegionId, RegionStatus>,
    [summary],
  );
  const types = useMemo(() => [...new Set(all.map((t) => t.testType))], [all]);
  const activeType = trendType && types.includes(trendType) ? trendType : (types[0] ?? null);
  const series = useMemo(
    () => all.filter((t) => t.testType === activeType).sort((a, b) => (a.date < b.date ? -1 : 1)),
    [all, activeType],
  );
  const regionTests = region ? new Set(getRegion(region).tests) : null;
  const filtered = all.filter(
    (t) => (!regionTests || regionTests.has(t.testType)) && matchesSearch(`${t.testType} ${t.notes ?? ''} ${t.date}`, query),
  );
  const def = activeType ? getTestTypeDef(activeType) : null;
  const latest = series[series.length - 1];
  const mapWidth = Math.min(170, width * 0.38);

  return (
    <Screen
      back
      eyebrow="Health"
      title="Body & labs"
      subtitle="Tap an organ to see the panels behind it."
      right={<IconButton icon="plus" tone="ink" label="Add lab result" onPress={() => setSheet({ open: true, entry: null })} />}>
      <Card index={0}>
        <View style={styles.mapRow}>
          <BodyMap statuses={statuses} selected={region} onSelect={(id) => setRegion((r) => (r === id ? null : id))} width={mapWidth} />
          <View style={styles.flex}>
            {region ? (
              <Animated.View key={region} entering={FadeIn} style={{ gap: space.sm }}>
                <Text variant="h2">{getRegion(region).name}</Text>
                <Text variant="small" muted>
                  {getRegion(region).blurb}
                </Text>
                <StatusPill status={summary[region].status} />
                {summary[region].tests.map((p) => (
                  <View key={p.testType} style={styles.point}>
                    <View style={[styles.dot, { backgroundColor: statusColor(p.status, dark) }]} />
                    <Text variant="small" style={styles.flex} numberOfLines={1}>
                      {p.testType}
                    </Text>
                    <Text variant="small" style={{ fontWeight: '700' }}>
                      {p.value}
                    </Text>
                  </View>
                ))}
                {summary[region].tests.length === 0 ? (
                  <Text variant="small" muted>
                    Tracks: {getRegion(region).tests.join(', ')}
                  </Text>
                ) : null}
              </Animated.View>
            ) : (
              <View style={{ gap: space.sm }}>
                <Text variant="label" muted>
                  Legend
                </Text>
                {(['ok', 'low', 'high', 'none'] as RegionStatus[]).map((s) => (
                  <View key={s} style={styles.point}>
                    <View style={[styles.dot, { backgroundColor: statusColor(s, dark) }]} />
                    <Text variant="small">{REGION_STATUS_LABELS[s]}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Card>

      {types.length ? (
        <>
          <Section title="Trend" />
          <Chips options={types.map((t) => ({ value: t, label: t }))} value={activeType} onChange={setTrendType} />
          <Card index={1} tone="sage">
            <CardHead label={`${activeType} · ${series.length} reading${series.length === 1 ? '' : 's'}`} tone="sage" />
            {latest ? (
              <Text variant="display">
                {latest.value}
                <Text variant="title">
                  {' '}
                  {latest.unit}
                </Text>
              </Text>
            ) : null}
            <LineChart values={series.map((t) => t.value)} dotColor={accent.tangerine} band={{ low: def?.low, high: def?.high }} />
            {def && (def.low != null || def.high != null) ? (
              <Text variant="small">
                Shaded band = normal range ({def.low ?? '—'}–{def.high ?? '—'} {def.unit})
              </Text>
            ) : null}
          </Card>
        </>
      ) : null}

      <Section title={region ? `${getRegion(region).name} results` : 'All results'} />
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="Test, note or date" autoCapitalize="none" />
      <Animated.View layout={LinearTransition} style={{ gap: space.sm }}>
        {filtered.map((t, i) => {
          const s = statusForTest(t.testType, t.value);
          return (
            <ListItem
              key={t.id}
              index={i}
              icon="test-tube"
              iconTone={s === 'ok' ? 'sage' : s === 'low' ? 'butter' : 'peach'}
              title={t.testType}
              subtitle={`${formatDate(t.date)}${t.notes ? ` · ${t.notes}` : ''}`}
              value={`${t.value} ${t.unit}`}
              onPress={() => setSheet({ open: true, entry: t })}
              right={<IconButton icon="creation" label={`Explain ${t.testType}`} size={36} tone="clear" onPress={() => setExplain(t)} />}
            />
          );
        })}
      </Animated.View>
      {filtered.length === 0 ? (
        <Empty
          icon="test-tube-empty"
          title={all.length ? 'No matches' : 'No lab results yet'}
          body={all.length ? 'Clear the search or tap the organ again to unselect it.' : 'Add your first result — values are encrypted with your passcode.'}
        />
      ) : null}

      <BloodTestSheet open={sheet.open} entry={sheet.entry} onClose={() => setSheet((s) => ({ ...s, open: false }))} onSaved={reload} />
      <AiSheet
        open={!!explain}
        onClose={() => setExplain(null)}
        title={explain ? `${explain.testType}: ${explain.value} ${explain.unit}` : 'Explain'}
        ask={() => explainBloodTest(explain!.testType, explain!.value, explain!.unit)}
      />
    </Screen>
  );
}

function StatusPill({ status }: { status: RegionStatus }) {
  const { dark } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: statusColor(status, dark) }]}>
      <Text variant="label" color={status === 'high' ? '#FFFFFF' : '#111111'}>
        {REGION_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mapRow: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
