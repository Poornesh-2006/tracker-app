import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, Modal, Portal, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { RecoveryCard } from '@/components/RecoveryCard';
import { MetricsCard } from '@/components/MetricsCard';
import { GlassCard } from '@/components/GlassCard';
import { AlertBanner } from '@/components/AlertBanner';
import { TrendChart } from '@/components/TrendChart';
import { NumberField } from '@/components/NumberField';
import { DateField } from '@/components/DateField';
import { computeAlerts } from '@/constants/metrics';
import { useDataStore } from '@/stores/data';
import { upsertDailyMetrics } from '@/services/metrics-service';
import { calculateRecoveryScore, checkMetricsAlerts, generateInsights } from '@/services/ai-engine';
import { useSettingsStore } from '@/stores/settings';
import { syncLatest } from '@/services/sync-manager';
import { palette, radii } from '@/constants/theme';
import { validateNumber } from '@/utils/validators';
import type { DailyMetrics, DailyMetricsInput } from '@/types';
import { shortDate, todayStr } from '@/utils/dates';

type ChartKey = 'recovery' | 'weight' | 'steps';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const loadDashboard = useDataStore((s) => s.loadDashboard);
  const metrics = useDataStore((s) => s.metrics);
  const bloodTests = useDataStore((s) => s.bloodTests);
  const workouts = useDataStore((s) => s.workouts);
  const foodByDate = useDataStore((s) => s.foodByDate);
  const caloriesByDate = useDataStore((s) => s.caloriesByDate);

  const [showMetrics, setShowMetrics] = useState(false);
  const [chart, setChart] = useState<ChartKey>('recovery');
  const syncEnabled = useSettingsStore((s) => s.syncEnabled);

  const syncIfEnabled = useCallback(async () => {
    if (syncEnabled) {
      try {
        await syncLatest();
      } catch (e) {
        console.error('Sync failed:', e);
      }
    }
  }, [syncEnabled]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const today = todayStr();
  const latest: DailyMetrics | null = metrics.length ? metrics[metrics.length - 1] : null;
  const todayCalories = caloriesByDate[today] ?? 0;
  const todayMeals = foodByDate[today] ?? [];
  const labAlerts = computeAlerts(
    bloodTests.map((t) => ({ testType: t.testType, value: t.value, unit: t.unit, date: t.date })),
  );
  const metricAlerts = checkMetricsAlerts(metrics);
  const alerts = [...metricAlerts, ...labAlerts];

  const insights = generateInsights({ metrics, workouts });
  const recentTests = bloodTests.slice(0, 3);
  const recentWorkouts = workouts.slice(0, 3);

  const chartData = (key: ChartKey) => {
    return metrics
      .map((m) => ({
        value: key === 'recovery' ? m.recoveryScore : key === 'weight' ? m.weight : m.steps,
        label: shortDate(m.date),
      }))
      .filter((p): p is { value: number; label: string } => p.value != null);
  };

  return (
    <Screen
      title="Today"
      subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      action={
        <Button
          mode="contained"
          compact
          onPress={() => setShowMetrics(true)}
          buttonColor={palette.vermillion}
          textColor="#fff"
          style={{ borderRadius: radii.pill }}>
          Log metrics
        </Button>
      }>
      <RecoveryCard
        score={latest?.recoveryScore ?? null}
        note={latest?.notes ?? null}
      />

      <MetricsCard
        heartRate={latest?.heartRate}
        steps={latest?.steps}
        sleepHours={latest?.sleepHours}
        stress={latest?.stress}
      />

      <View style={styles.quickActions}>
        <QuickAction icon="plus" label="Metrics" color={palette.lime} onPress={() => setShowMetrics(true)} />
        <QuickAction icon="flask-outline" label="Labs" color={palette.lavender} onPress={() => router.push('/(tabs)/medical')} />
        <QuickAction icon="food-apple-outline" label="Meal" color={palette.vermillion} onPress={() => router.push('/(tabs)/food')} />
        <QuickAction icon="dumbbell" label="Train" color={palette.chromeWhite} onPress={() => router.push('/(tabs)/workouts')} />
      </View>

      <GlassCard style={styles.foodCard} contentStyle={styles.foodContent}>
        <View style={styles.foodRow}>
          <View>
            <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>
              Calories today
            </Text>
            <Text style={[styles.metaValue, { color: theme.colors.onSurface }]}>
              {todayCalories} <Text style={styles.metaUnit}>kcal</Text>
            </Text>
          </View>
          <View>
            <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>Meals</Text>
            <Text style={[styles.metaValue, { color: theme.colors.onSurface }]}>{todayMeals.length}</Text>
          </View>
          <View>
            <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>Weight</Text>
            <Text style={[styles.metaValue, { color: theme.colors.onSurface }]}>
              {latest?.weight != null ? latest.weight : '—'}
              {latest?.weight != null ? <Text style={styles.metaUnit}> kg</Text> : null}
            </Text>
          </View>
        </View>
      </GlassCard>

      {recentTests.length > 0 ? (
        <View style={styles.recentSection}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Recent blood tests
          </Text>
          {recentTests.map((t) => (
            <Text key={t.id} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {t.testType}: {t.value} {t.unit} · {shortDate(t.date)}
            </Text>
          ))}
        </View>
      ) : null}

      {todayMeals.length > 0 ? (
        <View style={styles.recentSection}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Recent meals
          </Text>
          {todayMeals.slice(0, 3).map((m) => (
            <Text key={m.id} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {m.name}
              {m.calories != null ? ` · ${m.calories} kcal` : ''}
            </Text>
          ))}
        </View>
      ) : null}

      {recentWorkouts.length > 0 ? (
        <View style={styles.recentSection}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Recent workouts
          </Text>
          {recentWorkouts.map((w) => (
            <Text key={w.id} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {w.name}
              {w.durationMin != null ? ` · ${w.durationMin} min` : ''} · {shortDate(w.date)}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Trends
          </Text>
          <SegmentedButtons
            value={chart}
            onValueChange={(v) => setChart(v as ChartKey)}
            density="small"
            buttons={[
              { value: 'recovery', label: 'Recovery', icon: 'heart-pulse' },
              { value: 'weight', label: 'Weight', icon: 'scale-bathroom' },
              { value: 'steps', label: 'Steps', icon: 'shoe-print' },
            ]}
          />
        </View>
        <TrendChart
          data={chartData(chart)}
          color={palette.vermillion}
          yLabelSuffix={chart === 'recovery' ? '' : chart === 'weight' ? ' kg' : ''}
          area
        />
      </View>

      <View style={styles.alerts}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Alerts
        </Text>
        <AlertBanner alerts={alerts} />
      </View>

      {insights.length > 0 ? (
        <View style={styles.alerts}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Insights
          </Text>
          <View style={styles.insightList}>
            {insights.map((insight, i) => {
              const color =
                insight.level === 'positive'
                  ? '#2E7D32'
                  : insight.level === 'warning'
                    ? '#EF6C00'
                    : '#2F6FED';
              const icon =
                insight.level === 'positive'
                  ? 'trending-up'
                  : insight.level === 'warning'
                    ? 'alert'
                    : 'information-outline';
              return (
                <Card
                  key={i}
                  style={[
                    styles.insightCard,
                    { backgroundColor: theme.colors.surface, borderLeftColor: color },
                  ]}>
                  <Card.Content style={styles.insightContent}>
                    <MaterialCommunityIcons name={icon} size={20} color={color} />
                    <View style={styles.insightText}>
                      <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
                        {insight.title}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {insight.message}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        </View>
      ) : null}

      <Portal>
        <EditDailyMetricsModal
          visible={showMetrics}
          onDismiss={() => setShowMetrics(false)}
          initial={latest ?? null}
          onSaved={() => {
            setShowMetrics(false);
            loadDashboard();
            syncIfEnabled();
          }}
        />
      </Portal>
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        { backgroundColor: theme.dark ? '#2A2A29' : palette.paper, opacity: pressed ? 0.72 : 1 },
      ]}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={18} color={palette.warmBlack} />
      </View>
      <Text style={[styles.actionLabel, { color: theme.colors.onSurface }]}>{label}</Text>
      <MaterialCommunityIcons name="arrow-up-right" size={16} color={theme.colors.onSurfaceVariant} />
    </Pressable>
  );
}

interface EditDailyMetricsModalProps {
  visible: boolean;
  onDismiss: () => void;
  initial: DailyMetrics | null;
  onSaved: () => void;
}

function EditDailyMetricsModal({ visible, onDismiss, initial, onSaved }: EditDailyMetricsModalProps) {
  const theme = useTheme();
  const [date, setDate] = useState(todayStr());
  const [heartRate, setHeartRate] = useState('');
  const [steps, setSteps] = useState('');
  const [sleep, setSleep] = useState('');
  const [stress, setStress] = useState('');
  const [weight, setWeight] = useState('');
  const [recovery, setRecovery] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoRecovery, setAutoRecovery] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setDate(initial?.date ?? todayStr());
      setHeartRate(initial?.heartRate != null ? String(initial.heartRate) : '');
      setSteps(initial?.steps != null ? String(initial.steps) : '');
      setSleep(initial?.sleepHours != null ? String(initial.sleepHours) : '');
      setStress(initial?.stress != null ? String(initial.stress) : '');
      setWeight(initial?.weight != null ? String(initial.weight) : '');
      setRecovery(initial?.recoveryScore != null ? String(initial.recoveryScore) : '');
      setNotes(initial?.notes ?? '');
      setAutoRecovery(null);
      setError(null);
    }
  }, [visible, initial]);

  useEffect(() => {
    if (recovery) {
      setAutoRecovery(null);
      return;
    }
    const computed = calculateRecoveryScore({
      sleepHours: sleep ? Number(sleep) : null,
      stress: stress ? Number(stress) : null,
      heartRate: heartRate ? Number(heartRate) : null,
    });
    setAutoRecovery(computed);
  }, [recovery, sleep, stress, heartRate]);

  const save = async () => {
    const heartRateValue = heartRate ? Number(heartRate) : null;
    const sleepHours = sleep ? Number(sleep) : null;
    const stressNum = stress ? Number(stress) : null;
    const values = [
      ['heartRate', heartRateValue],
      ['sleepHours', sleepHours],
      ['stress', stressNum],
      ['weight', weight ? Number(weight) : null],
      ['recoveryScore', recovery ? Number(recovery) : null],
      ['steps', steps ? Number(steps) : null],
    ] as const;
    const invalid = values
      .map(([key, value]) => validateNumber(key, value))
      .find((result) => !result.valid);
    if (invalid) {
      setError(invalid.error ?? 'Please check the metric values.');
      return;
    }
    setError(null);
    setBusy(true);
    const manualRecovery = recovery ? Math.max(0, Math.min(100, Number(recovery))) : null;
    const recoveryScore =
      manualRecovery ??
      calculateRecoveryScore({
        sleepHours,
        stress: stressNum,
        heartRate: heartRateValue,
      });
    const input: DailyMetricsInput = {
      date,
      heartRate: heartRateValue,
      steps: steps ? Number(steps) : null,
      sleepHours,
      stress: stressNum,
      weight: weight ? Number(weight) : null,
      recoveryScore,
      notes: notes || null,
    };
    await upsertDailyMetrics(input);
    setBusy(false);
    onSaved();
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        Daily metrics
      </Text>
      <DateField value={date} onChange={setDate} maximumDate={new Date()} />
      <NumberField label="Steps" value={steps} onChange={setSteps} />
      <NumberField label="Resting heart rate (bpm)" value={heartRate} onChange={setHeartRate} />
      <NumberField label="Sleep (hours)" value={sleep} onChange={setSleep} decimal />
      <NumberField label="Weight (kg)" value={weight} onChange={setWeight} decimal />
      <NumberField label="Stress (1-10)" value={stress} onChange={setStress} />
      <NumberField label="Recovery score (0-100)" value={recovery} onChange={setRecovery} />
      {autoRecovery != null ? (
        <HelperText type="info">Auto-calculated from sleep, stress and HR: {autoRecovery}</HelperText>
      ) : null}
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      <TextInput
        mode="outlined"
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={styles.notes}
      />
      <View style={styles.modalActions}>
        <Button mode="text" onPress={onDismiss}>
          Cancel
        </Button>
        <Button mode="contained" onPress={save} loading={busy} disabled={busy}>
          Save
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },
  actionTile: {
    flex: 1,
    minHeight: 82,
    padding: 10,
    borderRadius: radii.lg,
    justifyContent: 'space-between',
    shadowColor: palette.warmBlack,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  actionIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
  },
  foodCard: { marginTop: 12 },
  foodContent: { paddingVertical: 14 },
  foodRow: { flexDirection: 'row', justifyContent: 'space-around' },
  metaLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  metaValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.7, marginTop: 3 },
  metaUnit: { fontSize: 12, fontWeight: '500' },
  recentSection: { marginTop: 16 },
  chartSection: { marginTop: 20 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  alerts: { marginTop: 20 },
  insightList: { gap: 8 },
  insightCard: { borderRadius: radii.lg, borderLeftWidth: 4, elevation: 0 },
  insightContent: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  insightText: { flex: 1, marginLeft: 10 },
  modal: {
    margin: 24,
    borderRadius: radii.xl,
    padding: 20,
    maxHeight: '85%',
  },
  notes: { marginTop: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 },
});
