import { useContext } from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { CardColorsContext } from './CardColors';
import { fonts, useTheme } from '@/constants/theme';

export type Variant = 'hero' | 'display' | 'h1' | 'h2' | 'title' | 'body' | 'small' | 'label' | 'num';

const VARIANTS: Record<Variant, TextStyle> = {
  /** Giant numbers ("8.8", "96%"). */
  hero: { fontFamily: fonts.numLight, fontSize: 76, lineHeight: 80, letterSpacing: -3 },
  display: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, letterSpacing: -1.8 },
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -1 },
  h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, letterSpacing: -0.5 },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  /** Tiny uppercase captions ("EXERCISE", "HEART RATE"). */
  label: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' },
  /** Thin stat numbers (minimal look). */
  num: { fontFamily: fonts.numLight, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
};

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  muted?: boolean;
  center?: boolean;
}

export function Text({ variant = 'body', color, muted, center, style, ...rest }: Props) {
  const { c } = useTheme();
  // Inside a card, default to that card's text colors.
  const card = useContext(CardColorsContext);
  return (
    <RNText
      {...rest}
      style={[
        VARIANTS[variant],
        { color: color ?? (muted ? (card?.muted ?? c.muted) : (card?.fg ?? c.ink)) },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
