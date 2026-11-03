import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { space, TAB_BAR_SPACE, useTheme } from '@/constants/theme';
import { IconButton } from './Controls';
import { Text } from './Text';

interface Props {
  title?: string;
  /** Small caption above the title ("TODAY", "HEALTH"). */
  eyebrow?: string;
  subtitle?: string;
  /** Show a back button (stack screens). */
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Replace the default header entirely. */
  header?: ReactNode;
  gap?: number;
}

/** Cream canvas + big editorial header + scroll body with room for the floating tab bar. */
export function Screen({ title, eyebrow, subtitle, back, right, children, refreshing = false, onRefresh, header, gap = space.md }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.flex, { backgroundColor: c.canvas }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: TAB_BAR_SPACE + insets.bottom, gap }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.ink} /> : undefined}>
        {header ?? (
          <Animated.View entering={FadeInUp.springify().damping(18)} style={styles.header}>
            <View style={styles.topRow}>
              {back ? (
                <IconButton icon="arrow-left" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
              ) : (
                <View />
              )}
              <View style={styles.right}>{right}</View>
            </View>
            {eyebrow ? (
              <Text variant="label" muted style={{ marginTop: back || right ? space.md : 0 }}>
                {eyebrow}
              </Text>
            ) : null}
            {title ? (
              <Text variant="display" accessibilityRole="header">
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Animated.View entering={FadeIn.delay(120)}>
                <Text muted>{subtitle}</Text>
              </Animated.View>
            ) : null}
          </Animated.View>
        )}
        {children}
      </ScrollView>
    </View>
  );
}

/** Section title inside a screen, with optional right-side action. */
export function Section({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="h2" style={styles.flex}>
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space.lg + 4 },
  header: { gap: 4, marginBottom: space.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  right: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', marginTop: space.md },
});
