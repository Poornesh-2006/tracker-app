import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Card, CardHead, CountUp, DotMatrix, IconButton, ListItem, Meter, Row, Screen, Section, Text } from '@/components/ui';
import { ON_PASTEL, ON_PASTEL_MUTED, space, useTheme } from '@/constants/theme';
import { POINT_RULES, RANKS } from '@/constants/gamification';
import { useFocusData } from '@/hooks/useFocusData';
import { getAchievements, getLifetimePoints, getUserRank, rankForPoints } from '@/services/gamification-service';

const load = () => Promise.all([getUserRank(), getAchievements(), getLifetimePoints()]).then(([rank, achievements, lifetime]) => ({ rank, achievements, lifetime }));

export default function MeScreen() {
  const { c } = useTheme();
  const { data } = useFocusData(useCallback(load, []));
  const lifetime = data?.lifetime ?? 0;
  const current = rankForPoints(lifetime);
  const next = RANKS.find((r) => r.minPoints > lifetime);
  const progress = next ? (lifetime - current.minPoints) / (next.minPoints - current.minPoints) : 1;
  const done = data?.achievements.filter((a) => a.isCompleted).length ?? 0;

  return (
    <Screen back eyebrow="You" title="Profile" right={<IconButton icon="cog-outline" label="Settings" onPress={() => router.push('/(tabs)/me/settings' as Href)} />}>
      <Card index={0} tone="ink">
        <CardHead label={`Rank ${current.level} of ${RANKS.length}`} tone="ink" right={<Text style={{ fontSize: 28 }}>{current.icon}</Text>} />
        <DotMatrix text={current.name} dot={6} color={c.onInk} offColor="transparent" />
        <View style={{ marginTop: space.lg, gap: 6 }}>
          <Meter progress={progress} color="#D4F25A" track="rgba(255,255,255,0.15)" height={10} />
          <Text variant="small" color={c.onInk} style={{ opacity: 0.7 }}>
            {next ? `${(next.minPoints - lifetime).toLocaleString()} lifetime points to ${next.name}` : 'Top rank reached 🔥'}
          </Text>
        </View>
      </Card>

      <Row>
        <Card index={1} tone="butter" style={styles.flex} onPress={() => router.push('/(tabs)/me/shop' as Href)} accessibilityLabel="Points, open shop">
          <CardHead label="To spend" icon="storefront-outline" tone="butter" />
          <CountUp value={data?.rank.totalPoints ?? 0} color={ON_PASTEL} />
          <Text variant="small" color={ON_PASTEL_MUTED}>
            points · open shop
          </Text>
        </Card>
        <Card index={2} tone="peach" style={styles.flex}>
          <CardHead label="Streak" icon="fire" tone="peach" />
          <CountUp value={data?.rank.currentStreak ?? 0} color={ON_PASTEL} suffix=" d" />
          <Text variant="small" color={ON_PASTEL_MUTED}>
            best {data?.rank.bestStreak ?? 0} days
          </Text>
        </Card>
      </Row>
      <Row>
        <Card index={3} style={styles.flex}>
          <CardHead label="This week" icon="calendar-week" />
          <CountUp value={data?.rank.weeklyPoints ?? 0} />
        </Card>
        <Card index={4} style={styles.flex}>
          <CardHead label="Lifetime" icon="infinity" />
          <CountUp value={lifetime} />
        </Card>
      </Row>

      <Card index={5} tone="sky">
        <CardHead label="How to earn (today’s entries only)" icon="information-outline" tone="sky" />
        {Object.entries(POINT_RULES).map(([reason, rule]) => (
          <Text key={reason} variant="small" color={ON_PASTEL}>
            {reason[0].toUpperCase() + reason.slice(1)}: +{rule.points} × up to {rule.dailyCap}/day · ×{current.multiplier} at {current.name}
          </Text>
        ))}
      </Card>

      <Section title={`Achievements · ${done}/${data?.achievements.length ?? 0}`} />
      {data?.achievements.map((a, i) => (
        <ListItem key={a.id} index={i + 6} icon={a.isCompleted ? 'trophy' : 'trophy-outline'} iconTone={a.isCompleted ? 'butter' : 'lavender'} title={`${a.badgeIcon} ${a.name}`} subtitle={a.description} value={`+${a.pointsReward}`} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
