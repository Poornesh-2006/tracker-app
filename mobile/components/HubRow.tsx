import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '@/components/GlassCard';
import { inkOn, mutedOn, palette, radii } from '@/constants/theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface HubRowProps {
  title: string;
  subtitle: string;
  icon: IconName;
  onPress: () => void;
}

/** One uniform navigation row used by every hub screen. */
export function HubRow({ title, subtitle, icon, onPress }: HubRowProps) {
  const theme = useTheme();
  const ink = inkOn(theme.dark);
  const muted = mutedOn(theme.dark);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <GlassCard contentStyle={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon} size={22} color={palette.vermillion} />
        </View>
        <View style={styles.text}>
          <Text style={[styles.title, { color: ink }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={muted} />
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', height: 72, paddingVertical: 0 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: palette.vermillion + '1A',
  },
  text: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, marginTop: 2 },
});
