import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Card, CardHead, CountUp, Row, Screen, Text, type IconName } from '@/components/ui';
import { useTheme, type Tone } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { listMarks, listSkills } from '@/services/education-service';
import { listInvestments, listTransactions, summarizeFinance, summarizePortfolio } from '@/services/finance-service';
import { listKnowledgeNodes } from '@/services/knowledge-service';
import { listMedia } from '@/services/media-service';
import { daysAgo } from '@/utils/dates';
import { money } from '@/utils/money';

async function loadBrain() {
  const [nodes, media, skills, marks, tx, inv] = await Promise.all([listKnowledgeNodes(), listMedia(), listSkills(), listMarks(), listTransactions(), listInvestments()]);
  const month = summarizeFinance(tx.filter((t) => t.date >= daysAgo(29)));
  return {
    learned: nodes.filter((n) => n.learned).length,
    nodes: nodes.length,
    reading: media.filter((m) => m.status === 'in_progress').length,
    skills: skills.length,
    avgMark: marks.length ? Math.round(marks.reduce((s, m) => s + (m.score / (m.maxScore || 100)) * 100, 0) / marks.length) : null,
    net: month.net,
    pnl: summarizePortfolio(inv).pnl,
  };
}

const go = (path: string) => () => router.push(path as Href);

function Tile({ tone, label, icon, value, caption, path, index }: { tone: Tone; label: string; icon: IconName; value: number | string; caption: string; path: string; index: number }) {
  const { tone: t } = useTheme();
  const { fg, muted } = t(tone);
  return (
    <Card index={index} tone={tone} style={styles.flex} onPress={go(path)} accessibilityLabel={label}>
      <CardHead label={label} icon={icon} tone={tone} />
      {typeof value === 'number' ? <CountUp value={value} color={fg} /> : <Text variant="num" color={fg}>{value}</Text>}
      <Text variant="small" color={muted}>
        {caption}
      </Text>
    </Card>
  );
}

export default function BrainHub() {
  const { data } = useFocusData(useCallback(loadBrain, []));

  return (
    <Screen eyebrow="Brain" title="Learn, build, earn." subtitle="Knowledge, study and money in one place.">
      <Card index={0} tone="lavender" onPress={go('/(tabs)/brain/graph')} accessibilityLabel="Knowledge graph">
        <CardHead label="Knowledge graph" icon="graph-outline" tone="lavender" />
        <View style={styles.split}>
          <Text variant="display">
            {data?.learned ?? 0}
            <Text variant="h2" muted>
              /{data?.nodes ?? 0}
            </Text>
          </Text>
          <Text variant="small" muted>
            topics learned
          </Text>
        </View>
      </Card>
      <Row>
        <Tile index={1} tone="butter" label="Library" icon="bookshelf" value={data?.reading ?? 0} caption="in progress" path="/(tabs)/brain/media" />
        <Tile index={2} tone="sky" label="Skills" icon="school-outline" value={data?.avgMark != null ? `${data.avgMark}%` : (data?.skills ?? 0)} caption={data?.avgMark != null ? 'average mark' : 'skills tracked'} path="/(tabs)/brain/skills" />
      </Row>
      <Row>
        <Tile index={3} tone="sage" label="Money" icon="wallet-outline" value={money(data?.net ?? 0)} caption="net · 30 days" path="/(tabs)/brain/finance" />
        <Tile index={4} tone="peach" label="Portfolio" icon="chart-line" value={money(data?.pnl ?? 0)} caption="profit / loss" path="/(tabs)/brain/investments" />
      </Row>
      <Row>
        <Tile index={5} tone="blush" label="College" icon="office-building-outline" value="Log" caption="attendance & events" path="/(tabs)/brain/college" />
        <Card index={6} tone="ink" style={styles.flex} onPress={go('/(tabs)/brain/insights')} accessibilityLabel="AI insights">
          <CardHead label="Insights" icon="creation" tone="ink" />
          <Text variant="num">
            AI
          </Text>
          <Text variant="small" muted>
            trends & local advice
          </Text>
        </Card>
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  split: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
});
