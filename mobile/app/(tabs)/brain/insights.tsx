import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { GlassCard } from '@/components/GlassCard';
import { useDataStore } from '@/stores/data';
import { generateInsights, predictStress } from '@/services/ai-engine';
import {
  GEMMA_OFFLINE_HINT,
  explainBloodTest,
  getHealthAdvice,
  isGemmaAvailable,
} from '@/services/gemma-api';
import { palette, radii } from '@/constants/theme';
import { errorMessage } from '@/utils/helpers';

export default function InsightsScreen() {
  const theme = useTheme();
  const metrics = useDataStore((s) => s.metrics);
  const workouts = useDataStore((s) => s.workouts);
  const bloodTests = useDataStore((s) => s.bloodTests);
  const loadDashboard = useDataStore((s) => s.loadDashboard);

  const [advice, setAdvice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gemmaOk, setGemmaOk] = useState(false);
  const [prompt, setPrompt] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      isGemmaAvailable().then(setGemmaOk).catch(() => setGemmaOk(false));
    }, [loadDashboard]),
  );

  const insights = generateInsights({ metrics, workouts });
  const stress = predictStress(metrics);
  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;

  const askAdvice = async () => {
    setBusy(true);
    try {
      setAdvice(await getHealthAdvice(metrics));
    } catch (e) {
      setAdvice(errorMessage(e, 'Could not reach local AI.'));
    } finally {
      setBusy(false);
    }
  };

  const explainLatest = async () => {
    const latest = bloodTests[0];
    if (!latest) {
      setAdvice('Log a blood test first in Health → Body Reports.');
      return;
    }
    setBusy(true);
    try {
      setAdvice(await explainBloodTest(latest.testType, latest.value, latest.unit));
    } catch (e) {
      setAdvice(errorMessage(e, 'Could not reach local AI.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.pad}>
        <GlassCard contentStyle={styles.card}>
          <Text style={[styles.label, { color: muted }]}>Predicted stress</Text>
          <Text style={[styles.big, { color: ink }]}>{stress != null ? `${stress}/10` : '—'}</Text>
          <Text style={[styles.hint, { color: muted }]}>
            Gemma: {gemmaOk ? 'online' : 'offline'}
          </Text>
          {!gemmaOk ? (
            <HelperText type="info" visible style={styles.hint}>
              {GEMMA_OFFLINE_HINT}
            </HelperText>
          ) : null}
        </GlassCard>

        <View style={styles.actions}>
          <Button
            mode="contained"
            buttonColor={palette.vermillion}
            textColor="#fff"
            loading={busy}
            disabled={busy || !gemmaOk}
            onPress={askAdvice}
            style={styles.btn}>
            Health advice
          </Button>
          <Button
            mode="outlined"
            textColor={ink}
            disabled={busy || !gemmaOk}
            onPress={explainLatest}
            style={styles.btn}>
            Explain latest lab
          </Button>
        </View>

        {insights.map((insight, i) => (
          <GlassCard key={i} style={{ marginTop: 10 }} contentStyle={styles.card}>
            <Text style={{ color: ink, fontWeight: '700' }}>{insight.title}</Text>
            <Text style={{ color: muted, fontSize: 13, marginTop: 4 }}>{insight.message}</Text>
          </GlassCard>
        ))}

        {advice ? (
          <GlassCard style={{ marginTop: 12 }} contentStyle={styles.card}>
            <Text style={{ color: ink, fontWeight: '800' }}>AI response</Text>
            <Text style={{ color: muted, lineHeight: 20, marginTop: 6 }}>{advice}</Text>
          </GlassCard>
        ) : null}

        <TextInput
          mode="outlined"
          label="Notes"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          outlineColor={palette.chromeWhite}
          activeOutlineColor={palette.vermillion}
          style={styles.notes}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: 16, paddingBottom: 120 },
  card: { paddingVertical: 14 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  big: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  hint: { fontSize: 12, marginTop: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btn: { borderRadius: radii.pill, borderColor: palette.chromeWhite },
  notes: { marginTop: 16, backgroundColor: 'transparent' },
});
