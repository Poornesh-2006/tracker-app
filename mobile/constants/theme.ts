import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/settings';

/**
 * lif.os design tokens: warm cream canvas, ink type, pastel bento cards,
 * one hot accent. Pastels keep dark ink on top in both modes; only the canvas
 * and surfaces invert in dark mode.
 */
export const pastel = {
  butter: '#F6DF73',
  blush: '#F5B9D2',
  lavender: '#CDC5F3',
  sky: '#BBD9F2',
  sage: '#CFE2B6',
  peach: '#F8C8A2',
  mint: '#BDE6D6',
} as const;

export type Tone = keyof typeof pastel | 'surface' | 'ink' | 'accent';

export const accent = {
  tangerine: '#FF5A1F',
  pink: '#F28AC0',
  lime: '#D4F25A',
} as const;

const light = {
  canvas: '#F3EEE3',
  surface: '#FFFCF6',
  surfaceAlt: '#EAE3D5',
  ink: '#141413',
  inkSoft: '#3A3833',
  muted: '#7A746A',
  line: '#E2DACB',
  onInk: '#F3EEE3',
  danger: '#D93B2B',
  success: '#2F8F5B',
  warning: '#C98A10',
  overlay: 'rgba(20,20,19,0.38)',
};

const dark: typeof light = {
  canvas: '#0E0E0D',
  surface: '#1A1917',
  surfaceAlt: '#252420',
  ink: '#F3EEE3',
  inkSoft: '#D6D0C4',
  muted: '#8F897E',
  line: '#2E2C28',
  onInk: '#141413',
  danger: '#FF6B5B',
  success: '#5BC48A',
  warning: '#F2B33D',
  overlay: 'rgba(0,0,0,0.6)',
};

export type Palette = typeof light;

/** Text color on a pastel card: always dark, so pastels read the same in both modes. */
export const ON_PASTEL = '#141413';
export const ON_PASTEL_MUTED = 'rgba(20,20,19,0.62)';
/** Meter track / dimmed bar on a pastel card. */
export const PASTEL_TRACK = 'rgba(20,20,19,0.12)';
export const PASTEL_DIM = 'rgba(20,20,19,0.25)';

export const radii = { sm: 12, md: 18, lg: 24, xl: 32, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_700Bold',
} as const;

/** Height reserved at the bottom of every tab screen for the floating bar. */
export const TAB_BAR_SPACE = 112;

export interface ToneColors {
  bg: string;
  fg: string;
  muted: string;
  track: string;
  hi: string;
}

export interface Theme {
  dark: boolean;
  c: Palette;
  /**
   * Colors for content on a card tone: background, text, muted text, a meter
   * track, and a highlight that stays visible in light AND dark mode.
   */
  tone: (t: Tone) => ToneColors;
}

function build(isDark: boolean): Theme {
  const c = isDark ? dark : light;
  return {
    dark: isDark,
    c,
    tone: (t) => {
      if (t === 'surface') return { bg: c.surface, fg: c.ink, muted: c.muted, track: c.line, hi: accent.tangerine };
      if (t === 'ink') {
        // The ink card inverts in dark mode (cream), so its accents must too.
        return isDark
          ? { bg: c.ink, fg: c.onInk, muted: 'rgba(20,20,19,0.6)', track: 'rgba(20,20,19,0.12)', hi: accent.tangerine }
          : { bg: c.ink, fg: c.onInk, muted: 'rgba(243,238,227,0.6)', track: 'rgba(255,255,255,0.15)', hi: accent.lime };
      }
      if (t === 'accent') return { bg: accent.tangerine, fg: '#FFFFFF', muted: 'rgba(255,255,255,0.75)', track: 'rgba(255,255,255,0.25)', hi: '#FFFFFF' };
      return { bg: pastel[t], fg: ON_PASTEL, muted: ON_PASTEL_MUTED, track: PASTEL_TRACK, hi: ON_PASTEL };
    },
  };
}

const LIGHT = build(false);
const DARK = build(true);

export function themeFor(mode: 'light' | 'dark'): Theme {
  return mode === 'dark' ? DARK : LIGHT;
}

/** Resolves the user's theme setting (light / dark / system). */
export function useThemeMode(): 'light' | 'dark' {
  const pref = useSettingsStore((s) => s.theme);
  const system = useColorScheme();
  return pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
}

export function useTheme(): Theme {
  return themeFor(useThemeMode());
}
