import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { accent, brand, radii, useTheme } from '@/constants/theme';
import { Tap, haptic, type IconName } from '@/components/ui';

/** Visible tabs, in order. The + button sits in the middle. Other routes (me) are hidden. */
export const TABS: { name: string; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', label: 'Today', icon: 'home-variant-outline', iconActive: 'home-variant' },
  { name: 'health', label: 'Health', icon: 'heart-outline', iconActive: 'heart' },
  { name: 'plan', label: 'Plan', icon: 'calendar-blank-outline', iconActive: 'calendar-blank' },
  { name: 'brain', label: 'Brain', icon: 'brain', iconActive: 'brain' },
];

const SLOT = 56;

/**
 * Floating black pill: four tabs with a sliding highlight and a raised pink +
 * in the middle that rotates into an × while the quick-add sheet is open.
 */
export function TabBar({ state, navigation, onPlus, plusOpen }: BottomTabBarProps & { onPlus: () => void; plusOpen: boolean }) {
  const { tone } = useTheme();
  const bar = tone('ink');
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);

  const activeName = state.routes[state.index]?.name;
  const activeIdx = TABS.findIndex((t) => t.name === activeName);
  // Slots: tab0, tab1, [+], tab2, tab3
  const slot = activeIdx < 0 ? -1 : activeIdx < 2 ? activeIdx : activeIdx + 1;
  const gap = width > 0 ? (width - 5 * SLOT) / 6 : 0;

  const x = useSharedValue(0);
  const visible = useSharedValue(0);
  useEffect(() => {
    // Timing, not spring: the circle travels from the old icon and stops exactly on the new one (no overshoot).
    if (slot >= 0) x.value = withTiming(gap + slot * (SLOT + gap), { duration: 260, easing: Easing.out(Easing.cubic) });
    visible.value = withTiming(slot >= 0 ? 1 : 0, { duration: 180 });
  }, [slot, gap, x, visible]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale: visible.value }], opacity: visible.value }));

  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withSpring(plusOpen ? 45 : 0, { damping: 13, stiffness: 180 });
  }, [plusOpen, rot]);
  const plusStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (activeName === name) {
      // Re-tap: pop the tab's stack to its root.
      navigation.navigate(name, { screen: 'index' } as never);
    } else if (!event.defaultPrevented) {
      navigation.navigate(name);
    }
  };

  const item = (t: (typeof TABS)[number]) => {
    const active = t.name === activeName;
    return (
      <Tap
        key={t.name}
        onPress={() => go(t.name)}
        scaleTo={0.85}
        style={styles.slot}
        accessibilityRole="tab"
        accessibilityLabel={t.label}
        accessibilityState={{ selected: active }}>
        <MaterialCommunityIcons name={active ? t.iconActive : t.icon} size={24} color={active ? brand.orange : brand.lightGray} />
      </Tap>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 4 }]}>
      <View style={[styles.bar, { backgroundColor: bar.bg, borderColor: bar.border ?? 'transparent' }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
        {width > 0 ? <Animated.View style={[styles.pill, { backgroundColor: '#333333' }, pill]} /> : null}
        <View style={[styles.row, { paddingHorizontal: gap, gap }]}>
          {item(TABS[0])}
          {item(TABS[1])}
          <Tap
            onPress={() => {
              haptic('medium');
              onPlus();
            }}
            haptics={false}
            scaleTo={0.88}
            style={[styles.plus, { backgroundColor: accent.pink }]}
            accessibilityLabel={plusOpen ? 'Close quick add' : 'Quick add'}>
            <Animated.View style={plusStyle}>
              <MaterialCommunityIcons name="plus" size={30} color="#FFFFFF" />
            </Animated.View>
          </Tap>
          {item(TABS[2])}
          {item(TABS[3])}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  bar: { width: '100%', maxWidth: 440, height: 68, borderRadius: radii.pill, justifyContent: 'center', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  slot: { width: SLOT, height: SLOT, borderRadius: SLOT / 2, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', left: 0, top: 6, width: SLOT, height: SLOT, borderRadius: SLOT / 2 },
  plus: { width: SLOT, height: SLOT, borderRadius: SLOT / 2, alignItems: 'center', justifyContent: 'center' },
});
