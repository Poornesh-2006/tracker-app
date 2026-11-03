import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, CardHead, Empty, Field, Row, Screen, Section, Text } from '@/components/ui';
import { AiSheet } from '@/components/ai/AiSheet';
import { ON_PASTEL, ON_PASTEL_MUTED, space, useTheme, type Tone } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { calculateRecoveryScore, generateInsights, predictStress } from '@/services/ai-engine';
import { GEMMA_OFFLINE_HINT, getHealthAdvice, isGemmaAvailable, queryGemma } from '@/services/gemma-api';
import { listDailyMetricsBetween } from '@/services/metrics-service';
import { listWorkouts } from '@/services/workout-service';
import { daysAgo, todayStr } from '@/utils/dates';

const LEVEL_TONE: Record<string, Tone> = { positive: 'sage', warning: 'peach', info: 'sky' };

async function loadInsights() {
  const [metrics, workouts, aiOnline] = await Promise.all([listDailyMetricsBetween(daysAgo(29), todayStr()), listWorkouts(100), isGemmaAvailable()]);
  const last = metrics[metrics.length - 1];
  return {
    metrics,
    insights: generateInsights({ metrics, workouts }),
    stress: predictStress(metrics),
    recovery: last ? (last.recoveryScore ?? calculateRecoveryScore(last)) : null,
    aiOnline,
  };
}

export default function InsightsScreen() {
  const { c } = useTheme();
  const { data } = useFocusData(useCallback(loadInsights, []));
  const [question, setQuestion] = useState('');
  const [ask, setAsk] = useState<{ title: string; run: () => Promise<string> } | null>(null);

  const askQuestion = () => {
    const q = question.trim();
    if (!q) return;
    setAsk({ title: q, run: () => queryGemma(`You are a concise, careful health and productivity coach. Not a doctor. Answer in under 120 words.\n\nQuestion: ${q}`) });
  };

  return (
    <Screen back eyebrow="Brain" title="Insights" subtitle="Patterns from your last 30 days.">
      <Row>
        <Card index={0} tone="accent" style={{ flex: 1 }}>
          <CardHead label="Recovery" icon="lightning-bolt" tone="accent" />
          <Text variant="display" color="#fff">
            {data?.recovery ?? '–'}
          </Text>
        </Card>
        <Card index={1} tone="lavender" style={{ flex: 1 }}>
          <CardHead label="Stress forecast" icon="weather-windy" tone="lavender" />
          <Text variant="display" color={ON_PASTEL}>
            {data?.stress ?? '–'}
            <Text variant="h2" color={ON_PASTEL_MUTED}>
              /10
            </Text>
          </Text>
        </Card>
      </Row>

      <Section title="What we noticed" />
      <View style={{ gap: space.sm }}>
        {data?.insights.map((ins, i) => {
          const tone = LEVEL_TONE[ins.level] ?? 'sky';
          return (
            <Card key={`${ins.title}-${i}`} index={i + 2} tone={tone}>
              <Text variant="title" color={ON_PASTEL}>
                {ins.title}
              </Text>
              <Text variant="small" color={ON_PASTEL_MUTED}>
                {ins.message}
              </Text>
            </Card>
          );
        })}
      </View>
      {data && !data.insights.length ? <Empty icon="chart-timeline-variant" title="Not enough data yet" body="Log a few check-ins and workouts — patterns appear after about a week." /> : null}

      <Section title="Ask local AI" />
      <Card index={10} tone="ink">
        <CardHead label={data?.aiOnline ? 'Gemma · online' : 'Gemma · offline'} icon={data?.aiOnline ? 'access-point' : 'access-point-off'} tone="ink" />
        {data?.aiOnline ? (
          <View style={{ gap: space.md }}>
            <Button label="Advice from my latest check-in" kind="pink" icon="creation" disabled={!data.metrics.length} onPress={() => setAsk({ title: 'Your daily advice', run: () => getHealthAdvice(data.metrics) })} />
          </View>
        ) : (
          <Text variant="small" color={c.onInk} style={{ opacity: 0.7 }}>
            {GEMMA_OFFLINE_HINT}
          </Text>
        )}
      </Card>
      {data?.aiOnline ? (
        <>
          <Field label="Your question" value={question} onChangeText={setQuestion} placeholder="How can I sleep better before exams?" multiline />
          <Button label="Ask" icon="send" onPress={askQuestion} disabled={!question.trim()} />
        </>
      ) : null}

      <AiSheet open={!!ask} onClose={() => setAsk(null)} title={ask?.title ?? ''} ask={() => ask!.run()} />
    </Screen>
  );
}
