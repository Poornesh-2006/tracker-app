import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { palette, radii } from '@/constants/theme';
import { GlassCard } from '@/components/GlassCard';
import { toDateStr } from '@/utils/dates';

interface MonthCalendarProps {
  /** YYYY-MM-DD */
  value: string;
  onChange: (date: string) => void;
  /** Days with logged data — shown as filled warm-black dots */
  markedDates?: string[];
  maximumDate?: Date;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Monday-first weekday index (0 = Mon … 6 = Sun). */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/**
 * Minimal circle-grid month calendar.
 * Matches the reference: huge day number, month/year, orange selected day.
 */
export function MonthCalendar({
  value,
  onChange,
  markedDates = [],
  maximumDate,
}: MonthCalendarProps) {
  const theme = useTheme();
  const selected = parseDateStr(value);
  const marked = useMemo(() => new Set(markedDates), [markedDates]);
  const max = maximumDate ? toDateStr(maximumDate) : null;

  const dayNum = selected.getDate();
  const monthName = selected
    .toLocaleDateString(undefined, { month: 'long' })
    .toUpperCase();
  const year = String(selected.getFullYear());
  const weekday = selected.toLocaleDateString(undefined, { weekday: 'short' });

  const cells = useMemo(() => {
    const first = startOfMonth(selected);
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const offset = mondayIndex(first);
    const total = Math.ceil((offset + daysInMonth) / 7) * 7;
    const today = toDateStr(new Date());
    const out: {
      key: string;
      date: string | null;
      kind: 'empty' | 'past' | 'today' | 'future' | 'selected' | 'marked';
    }[] = [];

    for (let i = 0; i < total; i++) {
      const day = i - offset + 1;
      if (day < 1 || day > daysInMonth) {
        out.push({ key: `e-${i}`, date: null, kind: 'empty' });
        continue;
      }
      const date = toDateStr(new Date(first.getFullYear(), first.getMonth(), day));
      let kind: (typeof out)[number]['kind'] = 'future';
      if (date === value) kind = 'selected';
      else if (date === today) kind = 'today';
      else if (marked.has(date)) kind = 'marked';
      else if (date < today) kind = 'past';
      out.push({ key: date, date, kind });
    }
    return out;
  }, [selected, value, marked]);

  const onPressDay = (date: string | null) => {
    if (!date) return;
    if (max && date > max) return;
    onChange(date);
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(selected.getFullYear(), selected.getMonth() + delta, 1);
    const clampedDay = Math.min(
      selected.getDate(),
      new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(),
    );
    const candidate = toDateStr(new Date(next.getFullYear(), next.getMonth(), clampedDay));
    if (max && candidate > max) {
      onChange(max);
      return;
    }
    onChange(candidate);
  };

  const isDark = theme.dark;
  const ink = isDark ? palette.orchidWhite : palette.warmBlack;
  const muted = isDark ? palette.chromeWhite : palette.masala;
  const emptyStroke = isDark ? '#5A5650' : palette.chromeWhite;
  const pastFill = isDark ? palette.orchidWhite : palette.warmBlack;
  const futureFill = isDark ? '#3A3733' : '#E8E4DC';

  return (
    <GlassCard contentStyle={styles.card}>
      <View style={styles.navRow}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} style={styles.navBtn}>
          <Text style={[styles.navArrow, { color: muted }]}>‹</Text>
        </Pressable>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={10} style={styles.navBtn}>
          <Text style={[styles.navArrow, { color: muted }]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={[styles.dayHuge, { color: ink }]}>{dayNum}</Text>
        <View style={styles.heroMeta}>
          <View>
            <Text style={[styles.month, { color: ink }]}>{monthName}</Text>
            <Text style={[styles.year, { color: muted }]}>{year}</Text>
          </View>
          <Text style={[styles.weekday, { color: muted }]}>{weekday}</Text>
        </View>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`${d}-${i}`} style={[styles.weekLabel, { color: muted }]}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          const disabled = !cell.date || (max != null && cell.date > max);
          let bg = 'transparent';
          let borderColor = 'transparent';
          let borderWidth = 0;

          if (cell.kind === 'empty') {
            borderColor = emptyStroke;
            borderWidth = 1.5;
          } else if (cell.kind === 'selected') {
            bg = palette.vermillion;
          } else if (cell.kind === 'today') {
            borderColor = palette.vermillion;
            borderWidth = 2;
          } else if (cell.kind === 'past' || cell.kind === 'marked') {
            bg = pastFill;
          } else {
            bg = futureFill;
          }

          return (
            <Pressable
              key={cell.key}
              disabled={disabled || cell.kind === 'empty'}
              onPress={() => onPressDay(cell.date)}
              style={styles.cell}
              hitSlop={4}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: bg,
                    borderColor,
                    borderWidth,
                    opacity: disabled && cell.kind !== 'empty' ? 0.35 : 1,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 20, paddingHorizontal: 18 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  navBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  navArrow: { fontSize: 28, fontWeight: '300', lineHeight: 30 },
  hero: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 },
  dayHuge: {
    fontSize: 92,
    lineHeight: 92,
    fontWeight: '800',
    letterSpacing: -4,
    marginRight: 14,
  },
  heroMeta: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 10,
  },
  month: { fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  year: { fontSize: 16, fontWeight: '500', marginTop: 2 },
  weekday: { fontSize: 16, fontWeight: '600', paddingTop: 4 },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
  },
});
