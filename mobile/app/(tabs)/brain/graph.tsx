import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Empty, Field, IconButton, ListItem, Screen, Section, Sheet, Tap, Text, toast } from '@/components/ui';
import { askDelete, attempt } from '@/components/forms/actions';
import { layoutGraph } from '@/components/brain/graphLayout';
import { ON_PASTEL, pastel, space, useTheme } from '@/constants/theme';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useFocusData } from '@/hooks/useFocusData';
import { bumpData } from '@/hooks/useDataVersion';
import { addKnowledgeNode, deleteKnowledgeNode, listKnowledgeNodes, setNodeLearned } from '@/services/knowledge-service';
import type { KnowledgeNode } from '@/types';

/** Each top-level topic and its subtree share one pastel. */
const ROOT_TONES = ['lavender', 'butter', 'sky', 'blush', 'sage', 'peach', 'mint'] as const;
const toneOf = (root: number) => ROOT_TONES[root % ROOT_TONES.length];
const NODE = 34;

export default function GraphScreen() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const { data } = useFocusData(useCallback(() => listKnowledgeNodes(), []));
  const [selected, setSelected] = useState<KnowledgeNode | null>(null);
  const [adding, setAdding] = useState<{ parent: KnowledgeNode | null } | null>(null);
  const [title, setTitle] = useState('');
  const { busy, error, setError, run } = useAsyncAction();

  const size = Math.min(width - 40, 420);
  const placed = useMemo(() => layoutGraph(data ?? [], size), [data, size]);
  const colorOf = (root: number) => pastel[toneOf(root)];
  const learned = (data ?? []).filter((n) => n.learned).length;

  const openAdd = (parent: KnowledgeNode | null) => {
    setSelected(null);
    setTitle('');
    setError(null);
    setTimeout(() => setAdding({ parent }), parent ? 260 : 0);
  };

  const save = () =>
    run(async () => {
      if (!title.trim()) throw new Error('Name the topic.');
      await addKnowledgeNode({ title: title.trim(), parentId: adding?.parent?.id ?? null });
      bumpData();
      toast(adding?.parent ? 'Subtopic added' : 'Topic added', 'graph-outline');
      setAdding(null);
    });

  const toggle = async (n: KnowledgeNode) => {
    if (!(await attempt(() => setNodeLearned(n.id, !n.learned)))) return;
    setSelected({ ...n, learned: !n.learned });
    if (!n.learned) toast(`Learned: ${n.title}`, 'check-decagram');
  };

  return (
    <Screen back eyebrow="Brain" title="Knowledge" subtitle={`${learned} of ${data?.length ?? 0} topics learned. Tap a node.`} right={<IconButton icon="plus" tone="ink" label="Add topic" onPress={() => openAdd(null)} />}>
      {placed.length ? (
        <Card index={0} padded={false} style={{ alignItems: 'center', paddingVertical: space.md }}>
          <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
              {placed.map((p) => (p.parent ? <Line key={`l${p.node.id}`} x1={p.parent.x} y1={p.parent.y} x2={p.x} y2={p.y} stroke={c.line} strokeWidth={2} /> : null))}
            </Svg>
            {placed.map((p, i) => {
              const r = p.depth === 0 ? NODE / 2 + 6 : NODE / 2 - p.depth * 2;
              return (
                <Animated.View key={p.node.id} entering={ZoomIn.delay(i * 30).springify().damping(14)} style={[styles.node, { left: p.x - r, top: p.y - r, width: r * 2, height: r * 2 }]}>
                  <Tap
                    onPress={() => setSelected(p.node)}
                    scaleTo={0.85}
                    accessibilityLabel={`${p.node.title}${p.node.learned ? ', learned' : ''}`}
                    style={[styles.dot, { borderRadius: r, backgroundColor: p.node.learned ? colorOf(p.root) : c.surface, borderColor: colorOf(p.root) }]}>
                    {p.node.learned ? <MaterialCommunityIcons name="check" size={r} color={ON_PASTEL} /> : null}
                  </Tap>
                  {p.depth <= 1 ? (
                    <Text variant="small" numberOfLines={1} style={[styles.label, { width: 90, left: r - 45 }]}>
                      {p.node.title}
                    </Text>
                  ) : null}
                </Animated.View>
              );
            })}
          </View>
        </Card>
      ) : data ? (
        <Empty icon="graph-outline" title="Start your map" body="Add a topic you’re learning, then branch into subtopics." action={<Button label="Add topic" small onPress={() => openAdd(null)} />} />
      ) : null}

      {placed.length ? <Section title="All topics" /> : null}
      {placed.map((p, i) => (
        <View key={p.node.id} style={{ marginLeft: Math.min(p.depth, 4) * 18 }}>
          <ListItem index={i} icon={p.node.learned ? 'check-decagram' : 'circle-outline'} iconTone={toneOf(p.root)} title={p.node.title} done={p.node.learned} onPress={() => setSelected(p.node)} />
        </View>
      ))}

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.title} subtitle={selected?.learned ? 'Learned ✓' : 'Still learning'}>
        {selected ? (
          <>
            {selected.notes ? <Text>{selected.notes}</Text> : null}
            <Button label={selected.learned ? 'Mark as not learned' : 'Mark as learned'} icon={selected.learned ? 'undo' : 'check-decagram'} onPress={() => void toggle(selected)} />
            <Button label="Add subtopic" kind="ghost" icon="source-branch" onPress={() => openAdd(selected)} />
            <Button
              label="Delete"
              kind="ghost"
              icon="delete-outline"
              onPress={() => {
                const n = selected;
                setSelected(null);
                askDelete(`"${n.title}" and its subtopics`, () => deleteKnowledgeNode(n.id));
              }}
            />
          </>
        ) : null}
      </Sheet>

      <Sheet open={!!adding} onClose={() => setAdding(null)} title={adding?.parent ? `Subtopic of ${adding.parent.title}` : 'New topic'} footer={<Button label="Add" icon="plus" onPress={save} loading={busy} />}>
        <Field label="Topic" value={title} onChangeText={setTitle} placeholder="Linear algebra" autoFocus onSubmit={save} error={error} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  node: { position: 'absolute', alignItems: 'center' },
  dot: { width: '100%', height: '100%', borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  label: { position: 'absolute', top: '100%', textAlign: 'center', marginTop: 2 },
});
