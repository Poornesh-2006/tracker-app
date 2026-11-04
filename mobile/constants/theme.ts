import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/settings';

/**
 * lif.os design tokens — minimal palette:
 * Branding Orange #E85002 · Black #000000 · White #F9F9F9 ·
 * Light Gray #A7A7A7 · Gray #646464 · Dark Gray #333333.
 * Green is reserved for "done" (streak checks, progress complete).
 */
export const brand = {
  orange: '#E85002',
  orangeDeep: '#C10801',
  orangeHot: '#F16001',
  sand: '#D9C3AB',
  black: '#000000',
  white: '#F9F9F9',
  lightGray: '#A7A7A7',
  gray: '#646464',
  darkGray: '#333333',
  green: '#4CC038',
} as const;

/**
 * Legacy tone names kept so screens read semantically ("sage" = good,
 * "peach" = warning). They all render as the same neutral "soft" card; the
 * values below are only used as small accents (dots, icons, graph nodes).
 */
export const pastel = {
  butter: brand.orange,
  peach: brand.orangeHot,
  sage: brand.green,
  sky: brand.lightGray,
  lavender: brand.gray,
  blush: brand.orangeDeep,
  mint: brand.sand,
} as const;

export type Tone = keyof typeof pastel | 'surface' | 'soft' | 'ink' | 'accent';

export const accent = {
  tangerine: brand.orange,
  /** Primary action color (the + button, primary CTAs). */
  pink: brand.orange,
  lime: brand.green,
} as const;

export type Palette = Record<'canvas' | 'surface' | 'surfaceAlt' | 'ink' | 'inkSoft' | 'muted' | 'line' | 'onInk' | 'danger' | 'success' | 'warning' | 'overlay', string>;

const light: Palette = {
  canvas: '#E6E6E8',
  surface: brand.white,
  surfaceAlt: '#D7D7DA',
  ink: '#111111',
  inkSoft: brand.darkGray,
  muted: brand.gray,
  line: '#D2D2D5',
  onInk: brand.white,
  danger: '#E5484D',
  success: '#2FA84F',
  warning: '#D88C00',
  overlay: 'rgba(0,0,0,0.38)',
};

const dark: Palette = {
  canvas: brand.black,
  surface: '#141414',
  surfaceAlt: '#1F1F1F',
  ink: brand.white,
  inkSoft: '#D4D4D4',
  muted: brand.lightGray,
  line: '#262626',
  // Text on ink-colored fills (selected chips, primary buttons): ink is white in dark mode.
  onInk: brand.black,
  danger: '#FF6B6B',
  success: brand.green,
  warning: '#F2B33D',
  overlay: 'rgba(0,0,0,0.7)',
};

/** @deprecated Card content now inherits colors from its card (see Card + useCardColors). */
export const ON_PASTEL = '#111111';
/** @deprecated see ON_PASTEL */
export const ON_PASTEL_MUTED = 'rgba(17,17,17,0.6)';

export const radii = { sm: 12, md: 18, lg: 24, xl: 30, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  /** Thin numerals for stats ("119 Min 485 Kcal"). */
  numLight: 'SpaceGrotesk_300Light',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_700Bold',
} as const;

/** Height reserved at the bottom of every tab screen for the floating bar. */
export const TAB_BAR_SPACE = 112;

/** Colors for content sitting on a card of a given tone. */
export interface ToneColors {
  bg: string;
  fg: string;
  muted: string;
  /** Meter track / dimmed bars. */
  track: string;
  /** Highlight (progress fill, key number accents) visible on this background. */
  hi: string;
  /** Optional hairline border (dark-mode widgets). */
  border?: string;
}

export interface Theme {
  dark: boolean;
  c: Palette;
  tone: (t: Tone) => ToneColors;
}

/** [card tint, accent] per named tone. Minimal: tints stay close to white / black. */
const TINTS_LIGHT: Record<keyof typeof pastel, [string, string]> = {
  butter: ['#FFF0E6', brand.orange],
  peach: ['#FFF5E3', '#D98200'],
  sage: ['#EBF6E7', '#2FA84F'],
  sky: ['#E9F1FC', '#3B7BE0'],
  lavender: ['#F0EBFC', '#7A5AE0'],
  blush: ['#FCEBEC', '#D9363E'],
  mint: ['#E7F6F2', '#1F9E86'],
};
const TINTS_DARK: Record<keyof typeof pastel, [string, string]> = {
  butter: ['#1E140D', brand.orange],
  peach: ['#1E170B', '#F2A33A'],
  sage: ['#0F1A10', brand.green],
  sky: ['#0D1420', '#5B9BFF'],
  lavender: ['#151021', '#9B7BFF'],
  blush: ['#200F10', '#FF6B6B'],
  mint: ['#0C1A17', '#3CC9A8'],
};

function build(isDark: boolean): Theme {
  const c = isDark ? dark : light;
  const surface: ToneColors = {
    bg: c.surface,
    fg: c.ink,
    muted: c.muted,
    track: isDark ? '#262626' : '#E2E2E4',
    hi: brand.orange,
    border: isDark ? '#222222' : undefined,
  };
  const soft: ToneColors = isDark
    ? { bg: '#1C1C1C', fg: brand.white, muted: brand.lightGray, track: '#2C2C2C', hi: brand.orange, border: '#262626' }
    : { bg: '#CFCFD3', fg: '#111111', muted: '#4A4A4D', track: 'rgba(0,0,0,0.1)', hi: brand.orange };
  const ink: ToneColors = isDark
    ? { bg: '#0B0B0B', fg: brand.white, muted: brand.lightGray, track: '#262626', hi: brand.orange, border: '#2A2A2A' }
    : { bg: '#1C1C1E', fg: brand.white, muted: brand.lightGray, track: '#333333', hi: brand.orange };
  const orange: ToneColors = { bg: brand.orange, fg: '#FFFFFF', muted: 'rgba(255,255,255,0.78)', track: 'rgba(255,255,255,0.28)', hi: '#FFFFFF' };
  return {
    dark: isDark,
    c,
    // Named tones are a whisper of color: a very light tint with a matching accent
    // for icons and progress. Layout and sizes are identical to plain cards.
    tone: (t) => {
      if (t === 'ink') return ink;
      if (t === 'accent') return orange;
      if (t === 'soft') return soft;
      if (t === 'surface') return surface;
      const [bg, hi] = (isDark ? TINTS_DARK : TINTS_LIGHT)[t];
      return {
        bg,
        fg: c.ink,
        muted: c.muted,
        track: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
        hi,
        border: isDark ? 'rgba(255,255,255,0.06)' : undefined,
      };
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
