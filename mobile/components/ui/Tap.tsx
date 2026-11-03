import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const APressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { damping: 15, stiffness: 320, mass: 0.6 };

export function haptic(kind: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === 'warning') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else void Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
}

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far it shrinks while pressed. */
  scaleTo?: number;
  haptics?: boolean;
  /** Screen-reader name for the long-press action (e.g. "Delete"). */
  longPressLabel?: string;
}

/** Pressable that springs down on press and taps the haptic engine. */
export function Tap({ style, scaleTo = 0.96, haptics = true, onPressIn, onPressOut, onPress, disabled, longPressLabel, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <APressable
      {...rest}
      disabled={disabled}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      accessibilityState={{ ...rest.accessibilityState, disabled: !!disabled }}
      accessibilityActions={rest.onLongPress ? [{ name: 'longpress', label: longPressLabel ?? 'More options' }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'longpress') rest.onLongPress?.(e as never);
      }}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptics) haptic();
        onPress?.(e);
      }}
      style={[style, animated, disabled && { opacity: 0.45 }]}
    />
  );
}
