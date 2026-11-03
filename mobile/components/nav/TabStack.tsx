import { Stack } from 'expo-router';
import { useTheme } from '@/constants/theme';

/** Headerless stack used inside every tab: screens slide in over the cream canvas. */
export function TabStack() {
  const { c } = useTheme();
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: c.canvas } }} />;
}
