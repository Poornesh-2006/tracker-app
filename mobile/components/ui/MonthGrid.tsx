import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { accent, radii, space, useTheme } from '@/constants/theme';
import { parseDateStr, toDateStr } from '@/utils/dates';
import { IconButton } from './Controls';
import { Tap } from './Tap';
import { Text } from './Text';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Adds a colored dot to a day (deduped), for building MonthGrid `dots`. */
export function addDot(dots: Record<string, string[]>, date: string, color: string): void {
  const list = (dots[date] ??= []);
  if (!list.includes(color)) list.push(color);
}

/** "YYYY-MM" for the month containing `date`. */
export const monthOf = (date: string) => date.slice(0, 7);

export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Monday-first 6×7 grid of local date strings (null = padding). */
function cells(month: string): (string | null)[] {
  const first = parseDateStr(`${month}-01`);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const out: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) out.push(toDateStr(new Date(first.getFullYear(), first.getMonth(), d)));
  while (out.length % 7) out.push(null);
  return out;
}

/**
 * Month calendar: big month title with ‹ ›, today ringed in tangerine,
 * selected day filled ink, up to 3 colored dots per day.
 */
export function MonthGrid({
  month,
  onMonthChange,
  selected,
  onSelect,
  dots = {},
}: {
  month: string;
  onMonthChange: (m: string) => void;
  selected: string | null;
  onSelect: (d: string) => void;
  dots?: Record<string, string[]>;
}) {
  const { c } = useTheme();
  const grid = useMemo(() => cells(month), [month]);
  const today = toDateStr(new Date());
  const title = parseDateStr(`${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.head}>
        <Text variant="h1" style={{ flex: 1 }} accessibilityRole="header">
          {title}
        </Text>
        <IconButton icon="chevron-left" label="Previous month" onPress={() => onMonthChange(shiftMonth(month, -1))} size={40} />
        <IconButton icon="chevron-right" label="Next month" onPress={() => onMonthChange(shiftMonth(month, 1))} size={40} />
      </View>
      <View style={styles.row}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} variant="label" muted style={styles.cellText}>
            {d}
          </Text>
        ))}
      </View>
      <Animated.View key={month} entering={FadeIn.duration(220)} style={styles.grid}>
        {grid.map((d, i) => {
          if (!d) return <View key={i} style={styles.cell} />;
          const isSel = d === selected;
          const isToday = d === today;
          const marks = dots[d] ?? [];
          return (
            <Tap
              key={d}
              onPress={() => onSelect(d)}
              scaleTo={0.85}
              style={styles.cell}
              accessibilityLabel={`${parseDateStr(d).toDateString()}${marks.length ? `, ${marks.length} entries` : ''}`}
              accessibilityState={{ selected: isSel }}>
              <View style={[styles.day, isSel && { backgroundColor: c.ink }, !isSel && isToday && { borderWidth: 2, borderColor: accent.tangerine }]}>
                <Text variant="small" color={isSel ? c.onInk : c.ink} style={{ fontWeight: isToday || isSel ? '700' : '400' }}>
                  {Number(d.slice(8))}
                </Text>
              </View>
              <View style={styles.dots}>
                {marks.slice(0, 3).map((color, k) => (
                  <View key={k} style={[styles.dot, { backgroundColor: color }]} />
                ))}
              </View>
            </Tap>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  row: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  cellText: { width: `${100 / 7}%`, textAlign: 'center' },
  day: { width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
