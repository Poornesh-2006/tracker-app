import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Ellipse, Rect } from 'react-native-svg';
import { getRegion, type RegionId, type RegionStatus } from '@/constants/body-map';
import { accent, pastel, useTheme } from '@/constants/theme';

const VIEW_W = 220;
const VIEW_H = 470;

interface Shape {
  kind: 'rect' | 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
}

/** One geometry list drives both artwork and tap targets so they can't drift apart. */
const REGION_SHAPES: { id: RegionId; shapes: Shape[] }[] = [
  { id: 'brain', shapes: [{ kind: 'ellipse', x: 80, y: 11, w: 60, h: 74 }] },
  { id: 'thyroid', shapes: [{ kind: 'rect', x: 97, y: 83, w: 26, h: 16, rx: 7 }] },
  { id: 'lungs', shapes: [{ kind: 'rect', x: 68, y: 106, w: 38, h: 64, rx: 18 }, { kind: 'rect', x: 114, y: 106, w: 38, h: 64, rx: 18 }] },
  { id: 'heart', shapes: [{ kind: 'rect', x: 92, y: 116, w: 36, h: 46, rx: 16 }] },
  { id: 'liver', shapes: [{ kind: 'rect', x: 68, y: 176, w: 84, h: 42, rx: 18 }] },
  { id: 'gut', shapes: [{ kind: 'rect', x: 68, y: 222, w: 84, h: 34, rx: 16 }] },
  { id: 'kidneys', shapes: [{ kind: 'rect', x: 74, y: 260, w: 72, h: 30, rx: 15 }] },
  { id: 'hormones', shapes: [{ kind: 'rect', x: 78, y: 294, w: 64, h: 30, rx: 15 }] },
  { id: 'muscles', shapes: [{ kind: 'rect', x: 34, y: 108, w: 26, h: 108, rx: 13 }, { kind: 'rect', x: 160, y: 108, w: 26, h: 108, rx: 13 }] },
  { id: 'bones', shapes: [{ kind: 'rect', x: 80, y: 330, w: 28, h: 132, rx: 14 }, { kind: 'rect', x: 112, y: 330, w: 28, h: 132, rx: 14 }] },
];

/** Pastel per status: in range = sage, low = butter, high = tangerine. */
export function statusColor(status: RegionStatus, dark: boolean): string {
  if (status === 'ok') return pastel.sage;
  if (status === 'low') return pastel.butter;
  if (status === 'high') return accent.tangerine;
  return dark ? '#2E2C28' : '#E2DACB';
}

/**
 * Tap-to-select anatomical map. Presses live on transparent overlays, not SVG
 * nodes: react-native-svg leaks responder props to the DOM on web.
 * The selected region gently pulses.
 */
export function BodyMap({
  statuses,
  selected,
  onSelect,
  width = 190,
}: {
  statuses: Record<RegionId, RegionStatus>;
  selected: RegionId | null;
  onSelect: (id: RegionId) => void;
  width?: number;
}) {
  const { c, dark } = useTheme();
  const height = Math.round((width * VIEW_H) / VIEW_W);
  const scale = width / VIEW_W;
  const pulse = useSharedValue(1);
  const still = useReducedMotion();

  useEffect(() => {
    pulse.value = 1;
    if (selected && !still) pulse.value = withRepeat(withSequence(withTiming(1.06, { duration: 650 }), withTiming(1, { duration: 650 })), -1);
  }, [selected, pulse, still]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const draw = (id: RegionId, highlight: boolean) =>
    REGION_SHAPES.find((r) => r.id === id)!.shapes.map((s, i) => {
      const fill = statusColor(statuses[id] ?? 'none', dark);
      const common = { fill, stroke: highlight ? c.ink : 'transparent', strokeWidth: highlight ? 3 : 0 };
      return s.kind === 'ellipse' ? (
        <Ellipse key={`${id}-${i}`} cx={s.x + s.w / 2} cy={s.y + s.h / 2} rx={s.w / 2} ry={s.h / 2} {...common} />
      ) : (
        <Rect key={`${id}-${i}`} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...common} />
      );
    });

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        {REGION_SHAPES.filter((r) => r.id !== selected).flatMap((r) => draw(r.id, false))}
      </Svg>
      {selected ? (
        <Animated.View style={[StyleSheet.absoluteFill, pulseStyle]} pointerEvents="none">
          <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
            {draw(selected, true)}
          </Svg>
        </Animated.View>
      ) : null}
      {REGION_SHAPES.flatMap(({ id, shapes }) =>
        shapes.map((s, i) => (
          <Pressable
            key={`hit-${id}-${i}`}
            accessibilityRole="button"
            accessibilityLabel={getRegion(id).name}
            accessibilityState={{ selected: selected === id }}
            onPress={() => onSelect(id)}
            style={{ position: 'absolute', left: s.x * scale, top: s.y * scale, width: s.w * scale, height: s.h * scale, borderRadius: (s.rx ?? s.w / 2) * scale }}
          />
        )),
      )}
    </View>
  );
}
