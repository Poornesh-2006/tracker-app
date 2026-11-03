import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Chips, Empty, IconButton, ListItem, Screen, Segmented, Tap, Text, enter } from '@/components/ui';
import { RoutineSheet, WARDROBE_CATEGORIES, WardrobeSheet, confirmDeleteRoutine } from '@/components/forms/GroomingSheets';
import { ON_PASTEL, ON_PASTEL_MUTED, pastel, radii, space } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { attempt } from '@/components/forms/actions';
import { listRoutines } from '@/services/grooming-service';
import { listWardrobe, updateWardrobeItem } from '@/services/wardrobe-service';
import type { GroomingRoutine, WardrobeCategory, WardrobeItem } from '@/types';

type Tab = 'wardrobe' | 'care' | 'schedule';
const TABS = [
  { value: 'wardrobe' as Tab, label: 'Wardrobe' },
  { value: 'care' as Tab, label: 'Care' },
  { value: 'schedule' as Tab, label: 'Schedule' },
];
const ALL = 'all' as const;
const TONES = ['blush', 'butter', 'sky', 'sage', 'lavender', 'peach'] as const;

const load = () => Promise.all([listWardrobe(), listRoutines()]).then(([wardrobe, routines]) => ({ wardrobe, routines }));

export default function GroomingScreen() {
  const { data } = useFocusData(useCallback(load, []));
  const [tab, setTab] = useState<Tab>('wardrobe');
  const [category, setCategory] = useState<WardrobeCategory | typeof ALL>(ALL);
  const [item, setItem] = useState<{ open: boolean; entry: WardrobeItem | null }>({ open: false, entry: null });
  const [routineOpen, setRoutineOpen] = useState(false);

  const items = (data?.wardrobe ?? []).filter((w) => category === ALL || w.category === category);
  const routines = (data?.routines ?? []).filter((r) => (tab === 'schedule' ? r.kind === 'schedule' : r.kind !== 'schedule'));

  const toggleFavorite = (w: WardrobeItem) => attempt(() => updateWardrobeItem(w.id, { ...w, favorite: !w.favorite }));

  const add = () => (tab === 'wardrobe' ? setItem({ open: true, entry: null }) : setRoutineOpen(true));

  return (
    <Screen back eyebrow="Health" title="Grooming" subtitle="Wardrobe, skincare and your care timetable." right={<IconButton icon="plus" tone="ink" label="Add" onPress={add} />}>
      <Segmented options={TABS} value={tab} onChange={setTab} />

      {tab === 'wardrobe' ? (
        <>
          <Chips options={[{ value: ALL, label: 'All' }, ...WARDROBE_CATEGORIES]} value={category} onChange={setCategory} />
          <Animated.View layout={LinearTransition} style={styles.grid}>
            {items.map((w, i) => (
              <Animated.View key={w.id} entering={enter(i)} layout={LinearTransition} style={styles.cell}>
                <Tap onPress={() => setItem({ open: true, entry: w })} style={[styles.tile, { backgroundColor: pastel[TONES[w.id % TONES.length]] }]} accessibilityLabel={w.name}>
                  {w.photoUri ? (
                    <Image source={{ uri: w.photoUri }} style={styles.photo} contentFit="cover" transition={200} />
                  ) : (
                    <View style={[styles.photo, styles.placeholder]}>
                      <MaterialCommunityIcons name="hanger" size={34} color={ON_PASTEL} />
                    </View>
                  )}
                  <View style={styles.tileText}>
                    <Text variant="title" color={ON_PASTEL} numberOfLines={1}>
                      {w.name}
                    </Text>
                    <Text variant="small" color={ON_PASTEL_MUTED} numberOfLines={1}>
                      {[w.color, w.brand].filter(Boolean).join(' · ') || w.category}
                    </Text>
                  </View>
                  <Tap onPress={() => void toggleFavorite(w)} style={styles.heart} scaleTo={0.8} accessibilityLabel={w.favorite ? 'Unfavorite' : 'Favorite'} accessibilityState={{ selected: w.favorite }}>
                    <MaterialCommunityIcons name={w.favorite ? 'heart' : 'heart-outline'} size={20} color={ON_PASTEL} />
                  </Tap>
                </Tap>
              </Animated.View>
            ))}
          </Animated.View>
          {data && items.length === 0 ? <Empty icon="hanger" title="Nothing here yet" body="Snap your clothes to build a lookbook." /> : null}
        </>
      ) : (
        <View style={{ gap: space.sm }}>
          {routines.map((r: GroomingRoutine, i) => (
            <ListItem
              key={r.id}
              index={i}
              icon={r.kind === 'schedule' ? 'calendar-clock' : r.kind === 'grooming' ? 'content-cut' : 'spray-bottle'}
              iconTone={r.kind === 'schedule' ? 'sky' : 'blush'}
              title={r.title}
              subtitle={[r.timeOfDay, r.scheduleDays, r.notes].filter(Boolean).join(' · ') || r.kind}
              onLongPress={() => confirmDeleteRoutine(r)}
            />
          ))}
          {data && routines.length === 0 ? (
            <Empty icon={tab === 'schedule' ? 'calendar-clock' : 'spray-bottle'} title={tab === 'schedule' ? 'No timetable yet' : 'No routines yet'} body="Tap + to add one. Long-press to delete." />
          ) : routines.length ? (
            <Text variant="small" muted center>
              Long-press a routine to delete it.
            </Text>
          ) : null}
        </View>
      )}

      <WardrobeSheet open={item.open} entry={item.entry} category={category === ALL ? undefined : category} onClose={() => setItem((s) => ({ ...s, open: false }))} />
      <RoutineSheet open={routineOpen} kind={tab === 'schedule' ? 'schedule' : 'skincare'} onClose={() => setRoutineOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { width: '47.8%' },
  tile: { borderRadius: radii.lg, overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 0.9 },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.35)' },
  tileText: { padding: space.md, gap: 2 },
  heart: { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
});
