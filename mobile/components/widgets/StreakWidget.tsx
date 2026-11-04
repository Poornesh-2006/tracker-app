import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, GlowBar, Icon, Ring, Text } from '@/components/ui';
import { brand, fonts, space } from '@/constants/theme';

import type { DayState } from '@/services/streak-service';

export type { DayState };

export interface StreakWidgetProps {
  streak: number;
  /** Monday → Sunday. */
  week: { label: string; state: DayState }[];
  /** Entrance stagger index. */
  index?: number;
  steps: number;
  goal: number;
  onPress?: () => void;
}

/** Flickering flame with an orange glow. */
function Flame() {
  const s = useSharedValue(1);
  const still = useReducedMotion();
  useEffect(() => {
    if (!still) s.value = withRepeat(withSequence(withTiming(1.08, { duration: 700 }), withTiming(0.96, { duration: 600 })), -1, true);
  }, [s, still]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[styles.flame, style]}>
      <MaterialCommunityIcons
        name="fire"
        size={52}
        color={brand.orange}
        style={Platform.OS === 'web' ? ({ textShadow: `0 0 18px ${brand.orange}` } as object) : { textShadowColor: brand.orange, textShadowRadius: 18 }}
      />
    </Animated.View>
  );
}

function DayDot({ state, index, progress }: { state: DayState; index: number; progress: number }) {
  const size = 38;
  return (
    <Animated.View entering={ZoomIn.delay(120 + index * 60).springify().damping(13)} style={{ width: size, height: size }}>
      {state === 'done' ? (
        <View style={[styles.dot, { width: size, height: size, backgroundColor: brand.green, shadowColor: brand.green }]}>
          <MaterialCommunityIcons name="check" size={20} color="#0B0B0B" />
        </View>
      ) : state === 'today' ? (
        <Ring progress={Math.max(0.08, progress)} size={size} stroke={3} color={brand.green} />
      ) : (
        <View style={[styles.dot, { width: size, height: size, backgroundColor: state === 'missed' ? '#262626' : '#1C1C1C' }]} />
      )}
    </Animated.View>
  );
}

/**
 * Streak widget (dark): flame + "N DAYS", this week's days as check circles
 * (today = in-progress ring), and today's steps with a glowing bar.
 */
export function StreakWidget({ streak, week, steps, goal, onPress, index = 0 }: StreakWidgetProps) {
  const pct = Math.min(1, steps / goal);
  return (
    <Card tone="ink" onPress={onPress} index={index} accessibilityLabel={`Streak ${streak} days. Steps ${steps} of ${goal}.`}>
      <View style={styles.head}>
        <Flame />
        <View style={styles.flex}>
          <Text variant="label" muted style={{ fontSize: 13 }}>
            Streak
          </Text>
          <Text style={styles.days}>
            {streak}
            <Text style={styles.daysUnit}> {streak === 1 ? 'DAY' : 'DAYS'}</Text>
          </Text>
        </View>
        <Icon name="shoe-print" size={30} />
      </View>
      <View style={styles.rule} />
      <View style={styles.week}>
        {week.map((d, i) => (
          <View key={d.label} style={styles.dayCol}>
            <DayDot state={d.state} index={i} progress={pct} />
            <Text variant="small" muted style={styles.dayLabel}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="label" muted style={{ marginTop: space.lg, fontSize: 13 }}>
        Steps
      </Text>
      <View style={styles.stepsRow}>
        <Text style={styles.steps}>
          {steps.toLocaleString()}
          <Text variant="small" muted style={styles.mono}>
            {' '}
            /{goal.toLocaleString()}
          </Text>
        </Text>
        <Text variant="small" muted style={styles.mono}>
          {Math.round(pct * 100)}%
        </Text>
      </View>
      <GlowBar progress={pct} color={brand.green} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flame: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  days: { fontFamily: fonts.numLight, fontSize: 34, lineHeight: 38, color: brand.white },
  daysUnit: { fontFamily: fonts.bodyMedium, fontSize: 16, letterSpacing: 1, color: brand.white },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: '#333333', marginVertical: space.lg },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6 },
  dayLabel: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 12 },
  dot: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  stepsRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.sm },
  steps: { fontFamily: fonts.numLight, fontSize: 32, lineHeight: 38, color: brand.white },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
});
