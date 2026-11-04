import { createContext, useContext } from 'react';
import { useTheme, type ToneColors } from '@/constants/theme';

/**
 * Colors of the card a component sits on. Text, meters, rings, bars and icons
 * read this so screens never hard-code "dark text on this card" colors.
 */
export const CardColorsContext = createContext<ToneColors | null>(null);

/** Colors of the enclosing card, or the plain canvas colors outside any card. */
export function useCardColors(): ToneColors {
  const ctx = useContext(CardColorsContext);
  const { tone } = useTheme();
  return ctx ?? tone('surface');
}
