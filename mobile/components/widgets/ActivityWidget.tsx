import { StyleSheet, View } from 'react-native';
import { Card, HeartWave, Icon, StripedBar, Text } from '@/components/ui';
import { brand, fonts, space } from '@/constants/theme';

/**
 * Activity widget (dark): weekly move minutes as a striped bar, big number,
 * resting heart-rate wave, and a stats strip (kcal · min · sessions).
 */
export function ActivityWidget({
  weekMin,
  goalMin,
  heartRate,
  kcal,
  sessions,
  streak,
  onPress,
}: {
  weekMin: number;
  goalMin: number;
  heartRate: number | null;
  kcal: number;
  sessions: number;
  streak: number;
  onPress?: () => void;
}) {
  const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <Card tone="ink" index={6} onPress={onPress} accessibilityLabel={`Moved ${weekMin} of ${goalMin} minutes this week`}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Icon name="walk" size={26} />
        </View>
        <View style={styles.flex}>
          <Text variant="h2">Move</Text>
          <Text variant="small" muted>
            🔥 {streak} {streak === 1 ? 'day' : 'days'}
          </Text>
        </View>
        <Text variant="small" muted>
          {time}
        </Text>
      </View>
      <View style={{ marginVertical: space.lg }}>
        <StripedBar progress={weekMin / goalMin} color={brand.orange} />
      </View>
      <View style={styles.mid}>
        <Text style={styles.big}>{weekMin.toLocaleString()}</Text>
        <Text variant="small" muted style={{ marginLeft: 6, marginBottom: 8 }}>
          min{'\n'}this week
        </Text>
        <View style={styles.flex} />
        <View style={{ alignItems: 'flex-end' }}>
          <HeartWave width={110} height={40} color={brand.orange} />
          <Text variant="title">
            {heartRate ?? '–'}
            <Text variant="small" muted>
              {' '}
              BPM
            </Text>
          </Text>
        </View>
      </View>
      <View style={styles.strip}>
        <Stat icon="fire" value={kcal.toLocaleString()} unit="kcal" />
        <View style={styles.sep} />
        <Stat icon="timer-outline" value={`${goalMin}`} unit="goal min" />
        <View style={styles.sep} />
        <Stat icon="dumbbell" value={`${sessions}`} unit={sessions === 1 ? 'session' : 'sessions'} />
      </View>
    </Card>
  );
}

function Stat({ icon, value, unit }: { icon: Parameters<typeof Icon>[0]['name']; value: string; unit: string }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={22} color={brand.lightGray} />
      <View>
        <Text variant="title">{value}</Text>
        <Text variant="small" muted>
          {unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#262626', alignItems: 'center', justifyContent: 'center' },
  mid: { flexDirection: 'row', alignItems: 'flex-end' },
  big: { fontFamily: fonts.display, fontSize: 52, lineHeight: 56, letterSpacing: -2, color: brand.white },
  strip: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg, padding: space.md, borderRadius: 18, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A' },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sep: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: '#333333', marginHorizontal: 6 },
});
