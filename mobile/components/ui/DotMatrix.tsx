import { memo, useState } from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/constants/theme';

/** 7-row dot glyphs ('#' = lit). Width varies per glyph. */
const GLYPHS: Record<string, string[]> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  ',': ['.', '.', '.', '.', '.', '#', '#'],
  ':': ['.', '#', '.', '.', '.', '#', '.'],
  '-': ['...', '...', '...', '###', '...', '...', '...'],
  '%': ['##...', '##..#', '...#.', '..#..', '.#...', '#..##', '...##'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['###..', '#..#.', '#...#', '#...#', '#...#', '#..#.', '###..'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
};

const FALLBACK = GLYPHS[' '];

interface Props {
  text: string;
  /** Dot diameter in px. */
  dot?: number;
  color?: string;
  /** Unlit dot color; pass 'transparent' to hide the grid. */
  offColor?: string;
  animate?: boolean;
  accessibilityLabel?: string;
  /** Row alignment when there's spare width. */
  align?: 'flex-start' | 'center';
}

const STEP = 1.38;
const GAP = 1.1;

/** Natural width of a string at a given dot size. */
function naturalWidth(chars: string[], dot: number): number {
  const cols = chars.reduce((s, ch) => s + (GLYPHS[ch] ?? FALLBACK)[0].length, 0);
  return cols * dot * STEP + Math.max(0, chars.length - 1) * dot * GAP;
}

const Glyph = memo(function Glyph({ rows, dot, color, off }: { rows: string[]; dot: number; color: string; off: string }) {
  const step = dot * STEP;
  const w = rows[0].length;
  return (
    <Svg width={w * step} height={7 * step}>
      {rows.flatMap((row, y) =>
        row.split('').map((cell, x) => (
          <Circle
            key={`${x}-${y}`}
            cx={x * step + step / 2}
            cy={y * step + step / 2}
            r={dot / 2}
            fill={cell === '#' ? color : off}
          />
        )),
      )}
    </Svg>
  );
});

/**
 * Dot-matrix display text (digits, A–Z, . , : - % /). Each glyph pops in with
 * a stagger; glyphs are keyed by position+char so only changed digits
 * re-animate when the value updates.
 */
export function DotMatrix({ text, dot: maxDot = 6, color, offColor, animate = true, accessibilityLabel, align = 'flex-start' }: Props) {
  const { c, dark } = useTheme();
  const [avail, setAvail] = useState(0);
  const on = color ?? c.ink;
  const off = offColor ?? (dark ? 'rgba(243,238,227,0.07)' : 'rgba(20,20,19,0.06)');
  const chars = text.toUpperCase().split('');
  // Auto-fit: never wider than the parent gives us.
  const natural = naturalWidth(chars, maxDot);
  const dot = avail > 0 && natural > avail ? Math.max(2, (maxDot * avail) / natural) : maxDot;
  return (
    <View
      onLayout={(e) => setAvail(e.nativeEvent.layout.width)}
      style={{ alignSelf: 'stretch', alignItems: align, minHeight: 7 * dot * STEP }}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? text}>
      {avail === 0 ? null : (
      <View style={{ flexDirection: 'row', gap: dot * GAP }}>
      {chars.map((ch, i) => {
        const glyph = <Glyph rows={GLYPHS[ch] ?? FALLBACK} dot={dot} color={on} off={off} />;
        return animate ? (
          <Animated.View key={`${i}-${ch}`} entering={ZoomIn.delay(i * 45).springify().damping(14)}>
            {glyph}
          </Animated.View>
        ) : (
          <View key={`${i}-${ch}`}>{glyph}</View>
        );
      })}
      </View>
      )}
    </View>
  );
}
