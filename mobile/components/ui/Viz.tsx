import { useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

import { Text, type Variant } from './Text';
import { useCardColors } from './CardColors';

/* ---------------------------------------------------------------- CountUp */

/** Number that eases from its previous value to the new one. */
export function CountUp({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
  variant = 'num',
  color,
  style,
  duration = 750,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  variant?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    const t0 = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = start + (value - start) * eased;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, duration]);

  const text = shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <Text variant={variant} color={color} style={style} accessibilityLabel={`${prefix}${value}${suffix}`}>
      {prefix}
      {text}
      {suffix}
    </Text>
  );
}

/* ------------------------------------------------------------------- Ring */

const ACircle = Animated.createAnimatedComponent(Circle);
const APath = Animated.createAnimatedComponent(Path);

/** Circular progress ring that sweeps to `progress` (0–1). */
export function Ring({
  progress,
  size = 88,
  stroke = 10,
  color,
  track,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const card = useCardColors();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress, p]);

  const props = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.value) }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track ?? card.track}
          strokeWidth={stroke}
          fill="none"
        />
        <ACircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? card.hi}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          animatedProps={props}
        />
      </Svg>
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------- Bars */

function Bar({ h, color, delay, width }: { h: number; color: string; delay: number; width: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withSpring(h, { damping: 16, stiffness: 140 }));
  }, [h, delay, v]);
  const style = useAnimatedStyle(() => ({ height: Math.max(width, v.value) }));
  return <Animated.View style={[{ width, borderRadius: width / 2, backgroundColor: color }, style]} />;
}

/** Pill bar chart that grows in. `highlight` marks one bar (e.g. today). */
export function Bars({
  values,
  height = 72,
  color,
  dim,
  highlight,
  barWidth = 8,
  labels,
  labelColor,
}: {
  values: number[];
  height?: number;
  color?: string;
  dim?: string;
  highlight?: number;
  barWidth?: number;
  labels?: string[];
  labelColor?: string;
}) {
  const card = useCardColors();
  const on = color ?? card.hi;
  const off = dim ?? card.track;
  const max = Math.max(1, ...values);
  return (
    <View>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        {values.map((v, i) => (
          <Bar
            key={i}
            h={(v / max) * height}
            width={barWidth}
            delay={i * 40}
            color={highlight == null || highlight === i ? on : off}
          />
        ))}
      </View>
      {labels ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {labels.map((l, i) => (
            <Text key={i} variant="label" color={labelColor ?? card.muted} style={{ width: barWidth + 8, textAlign: 'center', fontSize: 9 }}>
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ---------------------------------------------------------------- Progress */

/** Thin pill progress bar that fills with a spring. */
export function Meter({ progress, color, track, height = 8 }: { progress: number; color?: string; track?: string; height?: number }) {
  const card = useCardColors();
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withSpring(Math.max(0, Math.min(1, progress)), { damping: 18, stiffness: 120 });
  }, [progress, v]);
  const style = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track ?? card.track, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: color ?? card.hi }, style]} />
    </View>
  );
}

/* ------------------------------------------------------------- Line chart */

/**
 * Minimal line chart (trends of lab values / weight). Optional `band` shades the
 * normal range; the last point is emphasised.
 */
export function LineChart({
  values,
  height = 120,
  color,
  band,
  dotColor,
}: {
  values: number[];
  height?: number;
  color?: string;
  band?: { low?: number; high?: number };
  dotColor?: string;
}) {
  const card = useCardColors();
  const line = color ?? card.fg;
  const [width, setWidth] = useState(0);
  const pad = 8;
  const lo = Math.min(...values, band?.low ?? Infinity);
  const hi = Math.max(...values, band?.high ?? -Infinity);
  const span = hi - lo || 1;
  const x = (i: number) => pad + (values.length <= 1 ? (width - 2 * pad) / 2 : (i * (width - 2 * pad)) / (values.length - 1));
  const y = (v: number) => pad + (1 - (v - lo) / span) * (height - 2 * pad);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const last = values.length - 1;

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && values.length > 0 ? (
        <Svg width={width} height={height}>
          {band && (band.low != null || band.high != null) ? (
            <Rect
              x={0}
              width={width}
              y={y(Math.min(hi, band.high ?? hi))}
              height={Math.max(0, y(Math.max(lo, band.low ?? lo)) - y(Math.min(hi, band.high ?? hi)))}
              fill="rgba(76,192,56,0.16)"
              rx={10}
            />
          ) : null}
          <Polyline points={points} fill="none" stroke={line} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          {values.map((v, i) => (
            <Circle key={i} cx={x(i)} cy={y(v)} r={i === last ? 6 : 3} fill={i === last ? (dotColor ?? card.hi) : line} />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------- Pie */

/** Filled pie wedge (e.g. steps progress in the Today header). Sweeps in. */
export function Pie({ progress, size = 72, color, track }: { progress: number; size?: number; color?: string; track?: string }) {
  const card = useCardColors();
  const p = useSharedValue(0);
  const r = size / 2;
  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(0.9999, progress)), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress, p]);
  // Stroke-dash trick: a circle of radius r/2 with stroke width r draws a pie.
  const circ = Math.PI * r;
  const props = useAnimatedProps(() => ({ strokeDasharray: `${circ * p.value} ${circ}` }));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={r} cy={r} r={r} fill={track ?? card.track} />
      <ACircle cx={r} cy={r} r={r / 2} fill="none" stroke={color ?? card.hi} strokeWidth={r} animatedProps={props} />
    </Svg>
  );
}

/* ------------------------------------------------------------- StripedBar */

/** Thick progress bar with diagonal stripes and an end cap (activity widget). */
export function StripedBar({ progress, height = 44, color, track }: { progress: number; height?: number; color?: string; track?: string }) {
  const card = useCardColors();
  const fill = color ?? card.hi;
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [progress, v]);
  const style = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  const stripes = Array.from({ length: 40 }, (_, i) => i);
  return (
    <View style={{ height, borderRadius: 12, backgroundColor: track ?? card.track, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: 12, backgroundColor: fill, overflow: 'hidden', flexDirection: 'row' }, style]}>
        <View style={{ position: 'absolute', top: -height, left: 0, flexDirection: 'row', gap: 10, transform: [{ rotate: '25deg' }] }}>
          {stripes.map((i) => (
            <View key={i} style={{ width: 4, height: height * 3, backgroundColor: 'rgba(0,0,0,0.14)' }} />
          ))}
        </View>
        <View style={{ position: 'absolute', right: 0, top: -4, bottom: -4, width: 5, borderRadius: 3, backgroundColor: fill, borderLeftWidth: 2, borderLeftColor: 'rgba(0,0,0,0.25)' }} />
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------- HeartWave */

/** Smooth sine "heartbeat" line that draws itself in. */
export function HeartWave({ width = 140, height = 44, color }: { width?: number; height?: number; color?: string }) {
  const card = useCardColors();
  const d = Array.from({ length: 61 }, (_, i) => {
    const x = (i / 60) * width;
    const y = height / 2 + Math.sin((i / 60) * Math.PI * 4) * (height * 0.32) * (0.6 + 0.4 * Math.sin((i / 60) * Math.PI));
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const len = width * 2.2;
  const p = useSharedValue(len);
  useEffect(() => {
    p.value = withTiming(0, { duration: 1400, easing: Easing.out(Easing.cubic) });
  }, [p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: p.value }));
  return (
    <Svg width={width} height={height}>
      <APath d={d} fill="none" stroke={color ?? card.hi} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={`${len} ${len}`} animatedProps={props} />
    </Svg>
  );
}

/* ------------------------------------------------------------- GlowBar */

/** Slim progress bar with a soft glow (streak widget). */
export function GlowBar({ progress, color, height = 10 }: { progress: number; color: string; height?: number }) {
  const card = useCardColors();
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [progress, v]);
  const style = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: card.track }}>
      <Animated.View
        style={[
          { height, borderRadius: height, backgroundColor: color, shadowColor: color, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
          style,
        ]}
      />
    </View>
  );
}
