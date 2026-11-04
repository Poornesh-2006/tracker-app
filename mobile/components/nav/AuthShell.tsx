import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand, space, useTheme } from '@/constants/theme';
import { DotMatrix, Text } from '@/components/ui';

/** Slowly drifting pastel blob for the auth backdrop. */
function Blob({ color, size, top, left, delay }: { color: string; size: number; top: number; left: number; delay: number }) {
  const t = useSharedValue(0);
  const still = useReducedMotion();
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(
      withSequence(withTiming(1, { duration: 4200 + delay, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 4200 + delay, easing: Easing.inOut(Easing.sin) })),
      -1,
    );
  }, [t, delay, still]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: t.value * 18 }, { translateX: t.value * -10 }, { scale: 1 + t.value * 0.06 }] }));
  return <Animated.View style={[{ position: 'absolute', top, left, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.85 }, style]} />;
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Shared frame for welcome / unlock / account / reset: drifting blobs, dot-matrix clock, form card. */
export function AuthShell({ title, subtitle, children, clock = true }: { title: string; subtitle?: string; children: ReactNode; clock?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useClock();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const day = now.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <View style={[styles.flex, { backgroundColor: c.canvas }]}>
      <Blob color={brand.orange} size={220} top={-60} left={-70} delay={0} />
      <Blob color={brand.orangeDeep} size={160} top={120} left={240} delay={700} />
      <Blob color={brand.gray} size={120} top={300} left={-30} delay={1400} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}
          keyboardShouldPersistTaps="handled">
          {clock ? (
            <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.clock}>
              <DotMatrix text={time} dot={9} align="center" accessibilityLabel={`Time ${time}`} />
              <Text variant="label" muted style={{ marginTop: space.md }}>
                {day} · lif.os
              </Text>
            </Animated.View>
          ) : null}
          <Animated.View entering={FadeInDown.delay(120).springify().damping(16)} style={[styles.card, { backgroundColor: c.surface }]}>
            <Text variant="h1">{title}</Text>
            {subtitle ? <Text muted>{subtitle}</Text> : null}
            <View style={styles.body}>{children}</View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.xl, gap: space.xxl },
  clock: { alignItems: 'center' },
  card: { borderRadius: 32, padding: space.xl, gap: space.sm, maxWidth: 480, width: '100%', alignSelf: 'center' },
  body: { gap: space.lg, marginTop: space.md },
});
