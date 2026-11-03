import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Empty, IconButton, ListItem, Screen, Segmented, Text, toast } from '@/components/ui';
import { SchemaSheet, askDelete, text, type FormLayout } from '@/components/forms/SchemaSheet';
import { openLink } from '@/utils/links';
import { space } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { bumpData } from '@/hooks/useDataVersion';
import { addMedia, deleteMedia, listMedia, setMediaStatus } from '@/services/media-service';
import type { LearningMedia } from '@/types';

type Kind = LearningMedia['kind'] | 'all';
const KINDS = [
  { value: 'all' as Kind, label: 'All' },
  { value: 'book' as Kind, label: 'Books' },
  { value: 'video' as Kind, label: 'Videos' },
  { value: 'podcast' as Kind, label: 'Podcasts' },
];
const ICON = { book: 'book-open-page-variant-outline', video: 'play-box-outline', podcast: 'podcast' } as const;
const NEXT: Record<LearningMedia['status'], LearningMedia['status']> = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
const LABEL: Record<LearningMedia['status'], string> = { todo: 'Up next', in_progress: 'In progress', done: 'Done' };
const TONE = { todo: 'butter', in_progress: 'sky', done: 'sage' } as const;

const FIELDS: FormLayout = [
  { key: 'kind', label: 'Type', kind: 'choice', segmented: true, options: KINDS.slice(1) },
  { key: 'title', label: 'Title', kind: 'text', required: true, placeholder: 'Atomic Habits' },
  { key: 'creator', label: 'Author / channel', kind: 'text', caps: 'words' },
  { key: 'url', label: 'Link', kind: 'text', caps: 'none', placeholder: 'https://' },
  { key: 'notes', label: 'Notes', kind: 'text', multiline: true },
];

export default function MediaScreen() {
  const { data } = useFocusData(useCallback(() => listMedia(), []));
  const [kind, setKind] = useState<Kind>('all');
  const [adding, setAdding] = useState(false);

  const items = (data ?? []).filter((m) => kind === 'all' || m.kind === kind);

  const advance = async (m: LearningMedia) => {
    await setMediaStatus(m.id, NEXT[m.status]);
    bumpData();
    toast(`${m.title}: ${LABEL[NEXT[m.status]]}`, ICON[m.kind]);
  };

  return (
    <Screen back eyebrow="Brain" title="Library" subtitle="Tap to move along: up next → in progress → done." right={<IconButton icon="plus" tone="ink" label="Add to library" onPress={() => setAdding(true)} />}>
      <Segmented options={KINDS} value={kind} onChange={setKind} />
      <View style={{ gap: space.sm }}>
        {items.map((m, i) => (
          <ListItem
            key={m.id}
            index={i}
            icon={ICON[m.kind]}
            iconTone={TONE[m.status]}
            title={m.title}
            subtitle={[m.creator, LABEL[m.status]].filter(Boolean).join(' · ')}
            done={m.status === 'done'}
            onPress={() => void advance(m)}
            onLongPress={() => askDelete(`"${m.title}"`, () => deleteMedia(m.id))}
            right={m.url ? <IconButton icon="open-in-new" label="Open link" tone="clear" size={36} onPress={() => void openLink(m.url!).then((ok) => ok || toast('Couldn’t open that link', 'alert-circle'))} /> : undefined}
          />
        ))}
      </View>
      {data && !items.length ? <Empty icon="bookshelf" title="Nothing queued" body="Add a book, video or podcast." /> : null}
      {items.length ? (
        <Text variant="small" muted center>
          Long-press to delete.
        </Text>
      ) : null}
      <SchemaSheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Add to library"
        fields={FIELDS}
        defaults={kind !== 'all' ? { kind } : undefined}
        submitLabel="Add"
        successMessage="Added to library"
        successIcon="bookshelf"
        onSubmit={(v) => addMedia({ kind: v.kind as LearningMedia['kind'], title: text(v, 'title')!, creator: text(v, 'creator'), url: text(v, 'url'), notes: text(v, 'notes') })}
      />
    </Screen>
  );
}
