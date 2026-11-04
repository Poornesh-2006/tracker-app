import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import type { StreakSnapshot } from '@/services/streak-service';

/**
 * Android home-screen widgets (rendered natively by react-native-android-widget,
 * so only these primitives are allowed — no regular RN components).
 * Minimal brand palette: black, white, orange, green for "done".
 */
const C = {
  bg: '#0B0B0B',
  card: '#1A1A1A',
  line: '#262626',
  white: '#F9F9F9',
  gray: '#A7A7A7',
  dim: '#646464',
  orange: '#E85002',
  green: '#4CC038',
} as const;

export interface TodaySnapshot {
  steps: number;
  goal: number;
  kcal: number;
  waterMl: number;
  waterGoalMl: number;
  moveMin: number;
}

/** Orange ring (steps progress) as SVG. */
function ring(progress: number, size: number): string {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${C.line}" stroke-width="8"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${C.orange}" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${(circ * p).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

/** Thin horizontal progress bar built from two flex blocks (width in dp). */
function Bar({ progress, width, color }: { progress: number; width: number; color: `#${string}` }) {
  const fill = Math.max(4, Math.round(width * Math.max(0, Math.min(1, progress))));
  return (
    <FlexWidget style={{ width, height: 8, borderRadius: 4, backgroundColor: C.line, flexDirection: 'row' }}>
      <FlexWidget style={{ width: fill, height: 8, borderRadius: 4, backgroundColor: color }} />
    </FlexWidget>
  );
}

/** "Today" widget: steps ring + kcal / water / move. Tap opens the app. */
export function TodayHomeWidget({ data, width = 320 }: { data: TodaySnapshot; width?: number }) {
  const pct = data.goal ? data.steps / data.goal : 0;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`Steps ${data.steps} of ${data.goal}`}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: C.bg, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <TextWidget text="TODAY" style={{ fontSize: 11, color: C.gray, letterSpacing: 0.15 }} />
        <TextWidget text={data.steps.toLocaleString()} style={{ fontSize: 40, color: C.white, fontWeight: '300' }} />
        <TextWidget text={`steps · ${Math.round(pct * 100)}% of ${data.goal.toLocaleString()}`} style={{ fontSize: 12, color: C.gray }} />
        <FlexWidget style={{ flexDirection: 'row', marginTop: 10 }}>
          <Stat value={`${data.kcal}`} unit="kcal" />
          <Stat value={(data.waterMl / 1000).toFixed(1)} unit="L water" />
          <Stat value={`${data.moveMin}`} unit="min" />
        </FlexWidget>
      </FlexWidget>
      <SvgWidget svg={ring(pct, Math.min(110, Math.round(width * 0.32)))} style={{ height: Math.min(110, Math.round(width * 0.32)), width: Math.min(110, Math.round(width * 0.32)) }} />
    </FlexWidget>
  );
}

function Stat({ value, unit }: { value: string; unit: string }) {
  return (
    <FlexWidget style={{ flexDirection: 'column', marginRight: 16 }}>
      <TextWidget text={value} style={{ fontSize: 16, color: C.white, fontWeight: '700' }} />
      <TextWidget text={unit} style={{ fontSize: 11, color: C.gray }} />
    </FlexWidget>
  );
}

/** "Streak" widget: 🔥 N DAYS, this week's check circles, steps with green bar. */
export function StreakHomeWidget({ data, width = 320 }: { data: StreakSnapshot; width?: number }) {
  const pct = data.goal ? data.steps / data.goal : 0;
  const dot = Math.max(22, Math.min(34, Math.floor((width - 32 - 6 * 6) / 7)));
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'lifos://plan' }}
      accessibilityLabel={`Streak ${data.streak} days`}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: C.bg, borderRadius: 24, padding: 16, flexDirection: 'column' }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <TextWidget text="🔥" style={{ fontSize: 30 }} />
        <FlexWidget style={{ flexDirection: 'column', marginLeft: 10 }}>
          <TextWidget text="STREAK" style={{ fontSize: 11, color: C.gray }} />
          <TextWidget text={`${data.streak} ${data.streak === 1 ? 'DAY' : 'DAYS'}`} style={{ fontSize: 22, color: C.white, fontWeight: '300' }} />
        </FlexWidget>
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent', marginTop: 12 }}>
        {data.week.map((d) => (
          <FlexWidget key={d.date} style={{ flexDirection: 'column', alignItems: 'center' }}>
            <FlexWidget
              style={{
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: d.state === 'done' ? C.green : d.state === 'missed' ? C.line : C.card,
                borderWidth: d.state === 'today' ? 2 : 0,
                borderColor: C.green,
              }}>
              {d.state === 'done' ? <TextWidget text="✓" style={{ fontSize: 14, color: C.bg, fontWeight: '700' }} /> : null}
            </FlexWidget>
            <TextWidget text={d.label} style={{ fontSize: 10, color: C.gray, marginTop: 4 }} />
          </FlexWidget>
        ))}
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', width: 'match_parent', marginTop: 12, marginBottom: 6 }}>
        <TextWidget text={`${data.steps.toLocaleString()} / ${data.goal.toLocaleString()} steps`} style={{ fontSize: 13, color: C.white }} />
        <TextWidget text={`${Math.round(pct * 100)}%`} style={{ fontSize: 12, color: C.gray }} />
      </FlexWidget>
      <Bar progress={pct} width={width - 32} color={C.green} />
    </FlexWidget>
  );
}
