import { useCallback, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { Button, Card, CardHead, Field, ListItem, Screen, Section, Segmented, Sheet, Text, toast } from '@/components/ui';
import { ErrorText } from '@/components/forms/FormParts';
import { space, useTheme } from '@/constants/theme';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useFocusData } from '@/hooks/useFocusData';
import { shareExport } from '@/services/export';
import { queueLength, syncAll, syncLatest } from '@/services/sync-manager';
import { MIN_PASSWORD_LENGTH, useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { isAccountRequired, useSupabaseAuthStore } from '@/stores/supabase-auth';
import type { AppSettings } from '@/types';
import { confirmDestructive } from '@/utils/confirm';

const THEMES = [
  { value: 'system' as AppSettings['theme'], label: 'System' },
  { value: 'light' as AppSettings['theme'], label: 'Light' },
  { value: 'dark' as AppSettings['theme'], label: 'Dark' },
];

export default function SettingsScreen() {
  const { c } = useTheme();
  const { theme, setTheme, syncEnabled, setSyncEnabled } = useSettingsStore();
  const { lock, resetAll } = useAuthStore();
  const { user, signOut } = useSupabaseAuthStore();
  const cloud = isAccountRequired();
  const { data: pending, reload } = useFocusData(useCallback(() => (cloud ? queueLength() : Promise.resolve(0)), [cloud]));
  const [passOpen, setPassOpen] = useState(false);
  const sync = useAsyncAction();
  const exporting = useAsyncAction();

  const doSync = (full: boolean) =>
    sync.run(async () => {
      const r = full ? await syncAll() : await syncLatest();
      await reload();
      if (r.error) throw new Error(r.error);
      toast(`Synced ${r.pushed} day${r.pushed === 1 ? '' : 's'}`, 'cloud-check-outline');
    });

  const doExport = () =>
    exporting.run(async () => {
      await shareExport();
    }, 'Could not export data.');

  const wipe = () =>
    confirmDestructive('Delete all data?', 'Everything on this phone is erased: entries, lab results, passcode. This can’t be undone.', () => void resetAll(), 'Delete everything');

  return (
    <Screen back eyebrow="You" title="Settings">
      <Section title="Appearance" />
      <Segmented options={THEMES} value={theme} onChange={(t) => void setTheme(t)} />

      <Section title="Security" />
      <View style={{ gap: space.sm }}>
        <ListItem icon="lock-outline" iconTone="lavender" title="Lock now" subtitle="Auto-locks after 1 minute in the background" onPress={() => void lock()} />
        <ListItem icon="key-outline" iconTone="lavender" title="Change passcode" subtitle="Re-encrypts your lab results" onPress={() => setPassOpen(true)} chevron />
      </View>

      {cloud ? (
        <>
          <Section title="Cloud sync" />
          <Card>
            <CardHead label={user?.email ? `Signed in · ${user.email}` : 'Not signed in'} icon="cloud-outline" />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="title">Auto-sync</Text>
                <Text variant="small" muted>
                  Sends today’s metrics, meals and workouts when you open Today.
                </Text>
              </View>
              <Switch value={syncEnabled} onValueChange={(v) => void setSyncEnabled(v)} trackColor={{ true: c.ink }} accessibilityLabel="Auto-sync" />
            </View>
            <Text variant="small" muted style={{ marginTop: space.sm }}>
              {pending ? `${pending} change${pending === 1 ? '' : 's'} waiting to upload` : 'Everything uploaded'}
            </Text>
            <View style={{ gap: space.sm, marginTop: space.md }}>
              <Button label="Sync now" icon="cloud-upload-outline" onPress={() => void doSync(false)} loading={sync.busy} />
              <Button label="Sync all history" kind="ghost" onPress={() => void doSync(true)} disabled={sync.busy} />
              <ErrorText error={sync.error} />
              <Button label="Sign out" kind="ghost" icon="logout" onPress={() => void signOut()} />
            </View>
          </Card>
        </>
      ) : null}

      <Section title="Your data" />
      <View style={{ gap: space.sm }}>
        <ListItem icon="export-variant" iconTone="sky" title="Export everything" subtitle="Decrypted JSON — keep it somewhere safe" onPress={() => void doExport()} />
        <ErrorText error={exporting.error} />
        <ListItem icon="trophy-outline" iconTone="butter" title="Rewards shop" onPress={() => router.push('/(tabs)/me/shop' as Href)} chevron />
        <ListItem icon="delete-forever-outline" iconTone="peach" title="Delete all data" subtitle="Erase this phone’s lif.os data" onPress={wipe} />
      </View>

      <Text variant="small" muted center style={{ marginTop: space.lg }}>
        lif.os {Constants.expoConfig?.version ?? ''} · Data stays on this phone. Lab results are encrypted with AES-256 using your passcode; other entries are protected by the lock screen. Sync is opt-in.
      </Text>

      <ChangePasscodeSheet open={passOpen} onClose={() => setPassOpen(false)} />
    </Screen>
  );
}

function ChangePasscodeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const changePassword = useAuthStore((s) => s.changePassword);
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const { busy, error, run } = useAsyncAction();

  const save = () =>
    run(async () => {
      if (form.next.length < MIN_PASSWORD_LENGTH) throw new Error(`New passcode needs at least ${MIN_PASSWORD_LENGTH} characters.`);
      if (form.next !== form.confirm) throw new Error('New passcodes don’t match.');
      if (!(await changePassword(form.current, form.next))) throw new Error(useAuthStore.getState().error ?? 'Passcode change failed.');
      setForm({ current: '', next: '', confirm: '' });
      toast('Passcode changed · data re-encrypted', 'key-outline');
      onClose();
    });

  return (
    <Sheet open={open} onClose={onClose} title="Change passcode" subtitle="Keep the app open until it finishes." footer={<Button label="Change passcode" icon="key-outline" onPress={save} loading={busy} />}>
      <Field label="Current passcode" value={form.current} onChangeText={(current) => setForm((f) => ({ ...f, current }))} secure autoFocus />
      <Field label="New passcode" value={form.next} onChangeText={(next) => setForm((f) => ({ ...f, next }))} secure />
      <Field label="Confirm new passcode" value={form.confirm} onChangeText={(confirm) => setForm((f) => ({ ...f, confirm }))} secure onSubmit={save} />
      <ErrorText error={error} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});

