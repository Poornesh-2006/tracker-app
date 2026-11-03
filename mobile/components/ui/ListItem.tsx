import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { pastel, radii, space, useTheme, ON_PASTEL } from '@/constants/theme';
import { enter, type IconName } from './Card';
import { IconTile } from './Controls';
import { Tap } from './Tap';
import { Text } from './Text';

interface Props {
  title: string;
  subtitle?: string | null;
  icon?: IconName;
  iconTone?: keyof typeof pastel;
  right?: ReactNode;
  value?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  index?: number;
  chevron?: boolean;
  /** Strike-through + dim (done todos, completed items). */
  done?: boolean;
}

/** Card-style row: pastel icon tile, title/subtitle, value or custom right side. */
export function ListItem({ title, subtitle, icon, iconTone = 'butter', right, value, onPress, onLongPress, index, chevron, done }: Props) {
  const { c } = useTheme();
  const content = (
    <>
      {icon ? <IconTile icon={icon} bg={pastel[iconTone]} fg={ON_PASTEL} /> : null}
      <View style={styles.flex}>
        <Text variant="title" numberOfLines={2} style={done && { textDecorationLine: 'line-through', opacity: 0.5 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" muted numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? <Text variant="title">{value}</Text> : null}
      {right}
      {chevron ? <MaterialCommunityIcons name="chevron-right" size={22} color={c.muted} /> : null}
    </>
  );
  const row =
    onPress || onLongPress ? (
      <Tap onPress={onPress} onLongPress={onLongPress} longPressLabel="Delete" scaleTo={0.98} style={[styles.row, { backgroundColor: c.surface }]} accessibilityLabel={title}>
        {content}
      </Tap>
    ) : (
      <View style={[styles.row, { backgroundColor: c.surface }]}>{content}</View>
    );
  return index == null ? row : <Animated.View entering={enter(index)}>{row}</Animated.View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radii.lg, minHeight: 64 },
  flex: { flex: 1, gap: 2 },
});
