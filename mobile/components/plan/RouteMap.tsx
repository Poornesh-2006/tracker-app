import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { accent, pastel, space, useTheme } from '@/constants/theme';
import { Text } from '@/components/ui';

/** Decorative line colors cycled per segment (not real transit lines). */
export const LINE_COLORS = [accent.tangerine, '#6C5CE7', '#00A3A3', accent.pink, '#2F8F5B'];

/** From, via (comma separated) and to → ordered stop names. */
export function stopNames(from: string, via: string, to: string): string[] {
  return [from.trim(), ...via.split(',').map((s) => s.trim()), to.trim()].filter(Boolean);
}

export interface RouteStop {
  name: string;
  caption?: string | null;
  color?: string | null;
}

const ROW = 64;

function Segment({ color, index }: { color: string; index: number }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(index * 120, withSpring(1, { damping: 18, stiffness: 120 }));
  }, [h, index]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: h.value }] }));
  return <Animated.View style={[styles.segment, { backgroundColor: color, top: index * ROW + 14 }, style]} />;
}

/**
 * Vertical metro-style schematic. Segments draw in one after another; while
 * `progress` (0–1) is set, a pulsing marker rides the line.
 */
export function RouteMap({ stops, progress }: { stops: RouteStop[]; progress?: number | null }) {
  const { c } = useTheme();
  const pos = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (progress == null) return;
    pos.value = withSpring(progress * Math.max(0, stops.length - 1) * ROW, { damping: 20 });
  }, [progress, stops.length, pos]);
  const still = useReducedMotion();
  // Only pulse while a trip is in progress, and never with reduce-motion on.
  useEffect(() => {
    pulse.value = progress != null && progress < 1 && !still ? withRepeat(withSequence(withTiming(1.25, { duration: 600 }), withTiming(1, { duration: 600 })), -1) : 1;
  }, [pulse, progress, still]);
  const marker = useAnimatedStyle(() => ({ transform: [{ translateY: pos.value }, { scale: pulse.value }] }));

  if (stops.length < 2) return null;
  return (
    <View style={{ height: (stops.length - 1) * ROW + 30 }}>
      {stops.slice(1).map((s, i) => (
        <Segment key={i} index={i} color={s.color ?? LINE_COLORS[i % LINE_COLORS.length]} />
      ))}
      {stops.map((s, i) => {
        const end = i === 0 || i === stops.length - 1;
        return (
          <View key={`${s.name}-${i}`} style={[styles.stop, { top: i * ROW }]}>
            <View style={[styles.node, { borderColor: c.ink, backgroundColor: end ? c.ink : c.surface }, end && styles.nodeEnd]} />
            <View style={styles.label}>
              <Text variant="title" numberOfLines={1}>
                {s.name}
              </Text>
              {s.caption ? (
                <Text variant="small" muted numberOfLines={1}>
                  {s.caption}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
      {progress != null ? (
        <Animated.View style={[styles.marker, { backgroundColor: pastel.butter, borderColor: c.ink }, marker]} accessibilityLabel={`${Math.round(progress * 100)}% of the way`}>
          <MaterialCommunityIcons name="train" size={14} color="#141413" />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { position: 'absolute', left: 11, width: 8, height: ROW, borderRadius: 4, transformOrigin: 'top' },
  stop: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: space.md, height: 30 },
  node: { width: 30, height: 30, borderRadius: 15, borderWidth: 4 },
  nodeEnd: { width: 30, height: 30 },
  label: { flex: 1 },
  marker: { position: 'absolute', left: 1, top: 1, width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
