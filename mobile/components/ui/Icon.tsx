import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCardColors } from './CardColors';
import type { IconName } from './Card';

/** Icon that defaults to its card's text color (works on every tone, light and dark). */
export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const card = useCardColors();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? card.fg} />;
}
