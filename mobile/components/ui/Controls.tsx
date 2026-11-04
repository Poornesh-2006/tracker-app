import { createElement, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { accent, fonts, radii, space, useTheme } from '@/constants/theme';
import { addDays, formatDate, isValidDateStr, parseDateStr, toDateStr } from '@/utils/dates';
import type { IconName } from './Card';
import { Tap } from './Tap';
import { Text } from './Text';
import { useCardColors } from './CardColors';

/* ----------------------------------------------------------------- Button */

/** `inverse` = outlined button for use on ink (dark) cards. */
type ButtonKind = 'ink' | 'accent' | 'pink' | 'ghost' | 'inverse' | 'danger';

export function Button({
  label,
  onPress,
  kind = 'ink',
  icon,
  loading,
  disabled,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const { c } = useTheme();
  const card = useCardColors();
  const bg = { ink: c.ink, accent: accent.tangerine, pink: accent.pink, ghost: 'transparent', inverse: 'transparent', danger: c.danger }[kind];
  const fg = { ink: c.onInk, ghost: c.ink, inverse: card.fg, pink: '#FFFFFF', accent: '#FFFFFF', danger: '#FFFFFF' }[kind];
  return (
    <Tap
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={label}
      style={[
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg },
        kind === 'ghost' && { borderWidth: 1.5, borderColor: c.line },
        kind === 'inverse' && { borderWidth: 1.5, borderColor: card.muted },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <MaterialCommunityIcons name={icon} size={small ? 16 : 18} color={fg} /> : null}
          <Text variant="title" color={fg} style={small && { fontSize: 14 }}>
            {label}
          </Text>
        </>
      )}
    </Tap>
  );
}

/** Round icon-only button (header actions, close, back). */
export function IconButton({
  icon,
  onPress,
  label,
  tone = 'surface',
  size = 44,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'surface' | 'ink' | 'clear';
  size?: number;
}) {
  const { c } = useTheme();
  const bg = tone === 'ink' ? c.ink : tone === 'clear' ? 'transparent' : c.surface;
  const fg = tone === 'ink' ? c.onInk : c.ink;
  return (
    <Tap
      onPress={onPress}
      accessibilityLabel={label}
      scaleTo={0.9}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={icon} size={size * 0.48} color={fg} />
    </Tap>
  );
}

/* ------------------------------------------------------------------ Chips */

/** Segmented pill selector with a sliding ink highlight. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const segW = options.length ? (width - 8) / options.length : 0;
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withSpring(idx * segW, { damping: 18, stiffness: 220 });
  }, [idx, segW, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.segmented, { backgroundColor: c.surfaceAlt }, style]}
      accessibilityRole="tablist">
      {width > 0 ? <Animated.View style={[styles.segPill, { width: segW, backgroundColor: c.ink }, pill]} /> : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Tap
            key={o.value}
            onPress={() => onChange(o.value)}
            scaleTo={0.94}
            style={styles.segItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}>
            <Text variant="small" color={active ? c.onInk : c.ink} style={{ fontFamily: fonts.bodyBold }} numberOfLines={1}>
              {o.label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

/** Wrapping chips (filters, categories). */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Tap
            key={o.value}
            onPress={() => onChange(o.value)}
            scaleTo={0.92}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={[styles.chip, { backgroundColor: active ? c.ink : c.surface, borderColor: active ? c.ink : c.line }]}>
            <Text variant="small" color={active ? c.onInk : c.ink} style={{ fontFamily: fonts.bodyMedium }}>
              {o.label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

/* ----------------------------------------------------------------- Fields */

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secure,
  multiline,
  error,
  autoFocus,
  onSubmit,
  suffix,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secure?: boolean;
  multiline?: boolean;
  error?: string | null;
  autoFocus?: boolean;
  onSubmit?: () => void;
  suffix?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" muted>
        {label}
      </Text>
      <View
        style={[
          styles.field,
          { backgroundColor: c.surface, borderColor: error ? c.danger : focused ? c.ink : c.line },
          multiline && { minHeight: 92, alignItems: 'flex-start' },
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          keyboardType={keyboardType}
          secureTextEntry={secure && hidden}
          multiline={multiline}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize ?? (secure ? 'none' : 'sentences')}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmit}
          accessibilityLabel={label}
          style={[styles.input, { color: c.ink }, multiline && { textAlignVertical: 'top', paddingTop: 12 }]}
        />
        {suffix ? (
          <Text variant="small" muted>
            {suffix}
          </Text>
        ) : null}
        {secure ? (
          <Tap onPress={() => setHidden((h) => !h)} haptics={false} accessibilityLabel={hidden ? 'Show passcode' : 'Hide passcode'}>
            <MaterialCommunityIcons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={c.muted} />
          </Tap>
        ) : null}
      </View>
      {error ? (
        <Text variant="small" color={c.danger}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Numeric field: keeps the raw string so users can type "7." on the way to "7.5". */
export function NumberField(props: Omit<Parameters<typeof Field>[0], 'keyboardType'> & { integer?: boolean }) {
  return <Field {...props} keyboardType={props.integer ? 'number-pad' : 'decimal-pad'} />;
}

export { parseNum } from '@/utils/helpers';

/** Date picker field showing a pretty date; value is local "YYYY-MM-DD". */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (d: string) => void }) {
  const { c, dark } = useTheme();
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    // A real <input type="date"> on web: free text let "abc" or "2026-13-45" through.
    return (
      <View style={{ gap: 6 }}>
        <Text variant="label" muted>
          {label}
        </Text>
        {createElement('input', {
          type: 'date',
          value,
          'aria-label': label,
          max: '9999-12-31',
          onChange: (e: { target: { value: string } }) => isValidDateStr(e.target.value) && onChange(e.target.value),
          style: { minHeight: 52, borderRadius: radii.md, border: `1.5px solid ${c.line}`, padding: '0 16px', fontSize: 16, fontFamily: fonts.bodyMedium, color: c.ink, background: c.surface, colorScheme: dark ? 'dark' : 'light' },
        })}
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" muted>
        {label}
      </Text>
      <Tap onPress={() => setOpen(true)} style={[styles.field, { backgroundColor: c.surface, borderColor: c.line }]} accessibilityLabel={`${label}: ${formatDate(value)}`}>
        <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={c.muted} />
        <Text style={styles.flex}>{formatDate(value)}</Text>
      </Tap>
      {open ? (
        <DateTimePicker
          value={parseDateStr(value)}
          mode="date"
          onChange={(_, d) => {
            setOpen(false);
            if (d) onChange(toDateStr(d));
          }}
        />
      ) : null}
    </View>
  );
}

/** 1–5 (or 1–10) tappable scale, e.g. intensity / stress. */
export function Scale({ label, value, onChange, max = 5, hint }: { label: string; value: number | null; onChange: (v: number) => void; max?: number; hint?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="label" muted>
          {label}
        </Text>
        {hint ? (
          <Text variant="small" muted>
            {hint}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
          const active = value != null && n <= value;
          return (
            <Tap
              key={n}
              onPress={() => onChange(n)}
              scaleTo={0.88}
              accessibilityLabel={`${label} ${n}`}
              accessibilityState={{ selected: value === n }}
              style={[styles.scaleDot, { backgroundColor: active ? c.ink : c.surface, borderColor: active ? c.ink : c.line }]}>
              <Text variant="small" color={active ? c.onInk : c.muted} style={{ fontFamily: fonts.bodyBold }}>
                {n}
              </Text>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------ Empty state */

export function Empty({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.surfaceAlt }]}>
        <MaterialCommunityIcons name={icon} size={26} color={c.ink} />
      </View>
      <Text variant="title" center>
        {title}
      </Text>
      {body ? (
        <Text variant="small" muted center>
          {body}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

/** Small round icon tile used in list rows. */
export function IconTile({ icon, bg, fg, size = 40 }: { icon: IconName; bg: string; fg: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.36, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={icon} size={size * 0.5} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: radii.pill,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: space.lg },
  segmented: { flexDirection: 'row', borderRadius: radii.pill, padding: 4, minHeight: 44 },
  segPill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: radii.pill },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderRadius: radii.pill, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8 },
  field: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  // Web: our border shows focus; hide the browser's own outline (it drew a second box).
  input: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 16, paddingVertical: 12, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  scaleDot: { flex: 1, height: 44, borderRadius: radii.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.xl },
  emptyIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  flex: { flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.pill, padding: 4 },
});

/* -------------------------------------------------------------- DayStepper */

/** ‹ Today › day navigator. Can't go past today. */
export function DayStepper({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const { c } = useTheme();
  const shift = (n: number) => onChange(addDays(date, n));
  const today = toDateStr(new Date());
  const isToday = date >= today;
  const label = isToday ? 'Today' : date === addDays(today, -1) ? 'Yesterday' : formatDate(date);
  return (
    <View style={[styles.stepper, { backgroundColor: c.surface }]}>
      <IconButton icon="chevron-left" label="Previous day" onPress={() => shift(-1)} tone="clear" size={40} />
      <Text variant="title" style={{ flex: 1, textAlign: 'center' }} accessibilityLiveRegion="polite">
        {label}
      </Text>
      {isToday ? <View style={{ width: 40 }} /> : <IconButton icon="chevron-right" label="Next day" onPress={() => shift(1)} tone="clear" size={40} />}
    </View>
  );
}
