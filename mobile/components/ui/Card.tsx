import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { radii, space, useTheme, type Tone } from '@/constants/theme';
import { Tap } from './Tap';
import { Text } from './Text';
import { CardColorsContext, useCardColors } from './CardColors';

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Staggered entrance for lists of cards: pass the item's index. */
export const enter = (index = 0) =>
  FadeInDown.delay(Math.min(index, 12) * 55)
    .springify()
    .damping(18)
    .stiffness(160);

interface CardProps {
  tone?: Tone;
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Index for the staggered entrance; omit for no entrance animation. */
  index?: number;
  padded?: boolean;
  accessibilityLabel?: string;
}

/** Rounded bento card. Pressable cards spring on touch. */
export function Card({ tone = 'surface', children, onPress, onLongPress, style, index, padded = true, accessibilityLabel }: CardProps) {
  const t = useTheme().tone(tone);
  const body = [styles.card, { backgroundColor: t.bg }, t.border ? { borderWidth: 1, borderColor: t.border } : null, padded && styles.padded, style];
  const inner =
    onPress || onLongPress ? (
      <Tap onPress={onPress} onLongPress={onLongPress} style={body} scaleTo={0.97} accessibilityLabel={accessibilityLabel}>
        <CardColorsContext.Provider value={t}>{children}</CardColorsContext.Provider>
      </Tap>
    ) : (
      <View style={body} accessibilityLabel={accessibilityLabel}>
        <CardColorsContext.Provider value={t}>{children}</CardColorsContext.Provider>
      </View>
    );
  if (index == null) return inner;
  // The wrapper is the row child, so it must carry the card's flex sizing. Sizing
  // lives on a plain View: on web, Reanimated drops inline styles on views that
  // have an entering animation.
  const flex = StyleSheet.flatten(style)?.flex;
  return (
    <View style={flex != null ? { flex } : undefined}>
      <Animated.View entering={enter(index)}>{inner}</Animated.View>
    </View>
  );
}

/** Small caption + icon row used at the top of bento cards ("EXERCISE  🏃"). */
/** `tone` is optional: by default it follows the enclosing card. */
export function CardHead({ label, icon, tone, right }: { label: string; icon?: IconName; tone?: Tone; right?: ReactNode }) {
  const theme = useTheme();
  const ctx = useCardColors();
  const t = tone ? theme.tone(tone) : ctx;
  return (
    <View style={styles.head}>
      <Text variant="label" color={t.muted} style={styles.flex} numberOfLines={1}>
        {label}
      </Text>
      {right ?? (icon ? <MaterialCommunityIcons name={icon} size={18} color={t.hi === '#FFFFFF' ? t.fg : t.hi} /> : null)}
    </View>
  );
}

/** Two-column bento row; children share the width. */
export function Row({ children, gap = space.md, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', gap }, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, overflow: 'hidden' },
  padded: { padding: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  flex: { flex: 1 },
});
