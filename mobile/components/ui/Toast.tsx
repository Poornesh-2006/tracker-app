import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOutUp, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { create } from 'zustand';
import { radii, space, useTheme } from '@/constants/theme';
import type { IconName } from './Card';
import { haptic } from './Tap';
import { Text } from './Text';

interface ToastState {
  id: number;
  message: string | null;
  icon: IconName;
  show: (message: string, icon?: IconName) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  id: 0,
  message: null,
  icon: 'check-circle',
  show: (message, icon = 'check-circle') => set((s) => ({ id: s.id + 1, message, icon })),
  hide: () => set({ message: null }),
}));

/** Fire-and-forget confirmation pill ("Workout logged"). */
export const toast = (message: string, icon?: IconName) => {
  haptic(icon === 'alert-circle' ? 'warning' : 'success');
  useToast.getState().show(message, icon);
};

/** Mount once at the root. */
export function ToastHost() {
  const { id, message, icon, hide } = useToast();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, 2200);
    return () => clearTimeout(t);
  }, [id, message, hide]);

  if (!message) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + space.sm }]}>
      <Animated.View
        key={id}
        entering={SlideInUp.springify().damping(16)}
        exiting={FadeOutUp}
        style={[styles.pill, { backgroundColor: c.ink }]}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert">
        <MaterialCommunityIcons name={icon} size={18} color={c.onInk} />
        <Text variant="title" color={c.onInk} style={{ fontSize: 14 }}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: 12, borderRadius: radii.pill },
});
