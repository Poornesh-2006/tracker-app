import { View } from 'react-native';
import { Image } from 'expo-image';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { pickPhoto } from '@/utils/photo';

/** Save (+ Delete when editing) footer shared by every add/edit sheet. */
export function FormFooter({
  editing,
  saveLabel,
  editLabel = 'Save changes',
  onSave,
  onDelete,
  busy,
  icon = 'check',
}: {
  editing: boolean;
  saveLabel: string;
  editLabel?: string;
  onSave: () => void;
  onDelete?: () => void;
  busy?: boolean;
  icon?: Parameters<typeof Button>[0]['icon'];
}) {
  return (
    <>
      <Button label={editing ? editLabel : saveLabel} icon={icon} onPress={onSave} loading={busy} />
      {editing && onDelete ? <Button label="Delete" kind="ghost" icon="delete-outline" onPress={onDelete} disabled={busy} /> : null}
    </>
  );
}

/** Inline form error, announced to screen readers. */
export function ErrorText({ error }: { error: string | null }) {
  const { c } = useTheme();
  return error ? (
    <Text variant="small" color={c.danger} accessibilityRole="alert">
      {error}
    </Text>
  ) : null;
}

/** Thumbnail + attach/replace/remove buttons for an optional photo. */
export function PhotoField({ uri, onChange, label = 'photo', camera = false }: { uri: string | null; onChange: (uri: string | null) => void; label?: string; camera?: boolean }) {
  const pick = async (source: 'library' | 'camera') => {
    const next = await pickPhoto(source);
    if (next) onChange(next);
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {uri ? <Image source={{ uri }} style={{ width: 56, height: 56, borderRadius: 14 }} contentFit="cover" accessibilityLabel={label} /> : null}
      {camera ? <Button label="Camera" kind="ghost" icon="camera-outline" small onPress={() => void pick('camera')} /> : null}
      <Button label={uri ? `Replace ${label}` : `Attach ${label}`} kind="ghost" icon="image-outline" small onPress={() => void pick('library')} />
      {uri ? <Button label="Remove" kind="ghost" small onPress={() => onChange(null)} /> : null}
    </View>
  );
}
