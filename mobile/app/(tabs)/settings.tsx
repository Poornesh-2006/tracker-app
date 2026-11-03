import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  HelperText,
  List,
  Modal,
  Portal,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { Screen } from '@/components/Screen';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { useSupabaseAuthStore } from '@/stores/supabase-auth';
import { shareExport } from '@/services/export';
import { isSupabaseConfigured } from '@/services/supabase';
import { syncLatest, syncAll } from '@/services/sync-manager';
import { errorMessage } from '@/utils/helpers';

export default function SettingsScreen() {
  const theme = useTheme();
  const themePref = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const units = useSettingsStore((s) => s.units);
  const setUnits = useSettingsStore((s) => s.setUnits);
  const syncEnabled = useSettingsStore((s) => s.syncEnabled);
  const setSyncEnabled = useSettingsStore((s) => s.setSyncEnabled);
  const lock = useAuthStore((s) => s.lock);
  const resetAll = useAuthStore((s) => s.resetAll);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const authStatus = useSupabaseAuthStore((s) => s.status);
  const authUser = useSupabaseAuthStore((s) => s.user);
  const authInit = useSupabaseAuthStore((s) => s.init);
  const signOut = useSupabaseAuthStore((s) => s.signOut);

  useEffect(() => {
    authInit();
  }, [authInit]);

  const version = Constants.expoConfig?.version ?? '0.1.0';

  const doSync = async (full = false) => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const result = full ? await syncAll() : await syncLatest();
      setSyncStatus(
        result.error
          ? `Synced ${result.pushed} item(s) — ${result.error}`
          : `Synced ${result.pushed} item(s). ${result.remaining} waiting.`,
      );
    } finally {
      setSyncing(false);
    }
  };

  const configured = isSupabaseConfigured();
  const signedIn = authStatus === 'signedIn';

  const doExport = async () => {
    setExporting(true);
    try {
      await shareExport();
    } catch (e) {
      Alert.alert('Export failed', errorMessage(e, 'Could not export data.'));
    } finally {
      setExporting(false);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset all data?',
      'This permanently deletes all local data and the passcode. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: () => resetAll() },
      ],
    );
  };

  return (
    <Screen title="Settings">
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Title
          title="Appearance"
          titleVariant="titleMedium"
          left={(props) => <MaterialCommunityIcons {...props} name="palette-outline" size={22} color={theme.colors.primary} />}
        />
        <Card.Content>
          <SegmentedButtons
            value={themePref}
            onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
            buttons={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Title
          title="Units"
          titleVariant="titleMedium"
          left={(props) => (
            <MaterialCommunityIcons
              {...props}
              name="ruler"
              size={22}
              color={theme.colors.primary}
            />
          )}
        />
        <Card.Content>
          <SegmentedButtons
            value={units}
            onValueChange={(value) => setUnits(value as 'metric' | 'imperial')}
            buttons={[
              { value: 'metric', label: 'Metric (kg)' },
              { value: 'imperial', label: 'Imperial (lb)' },
            ]}
          />
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Title
          title="Security"
          titleVariant="titleMedium"
          left={(props) => <MaterialCommunityIcons {...props} name="shield-lock-outline" size={22} color={theme.colors.primary} />}
        />
        <Card.Content>
          <List.Item
            title="Lock app now"
            description="Require passcode to view your data"
            left={() => <List.Icon icon="lock-outline" />}
            onPress={() => lock()}
          />
          <List.Item
            title="Change passcode"
            description="Re-encrypts all medical data with a new key"
            left={() => <List.Icon icon="form-textbox-password" />}
            onPress={() => setShowChangePassword(true)}
          />
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Title
          title="Data"
          titleVariant="titleMedium"
          left={(props) => <MaterialCommunityIcons {...props} name="database-outline" size={22} color={theme.colors.primary} />}
        />
        <Card.Content>
          <List.Item
            title="Export data (JSON)"
            description="All records, decrypted into a shareable file"
            left={() => <List.Icon icon="export-variant" />}
            onPress={doExport}
            disabled={exporting}
          />
          <List.Item
            title="Delete all data"
            description="Erase everything on this device"
            titleStyle={{ color: theme.colors.error }}
            left={() => <List.Icon icon="delete-forever-outline" color={theme.colors.error} />}
            onPress={confirmReset}
          />
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Title
          title="Cloud sync"
          titleVariant="titleMedium"
          left={(props) => <MaterialCommunityIcons {...props} name="cloud-sync-outline" size={22} color={theme.colors.primary} />}
        />
        <Card.Content>
          {!configured ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Add SUPABASE_URL and SUPABASE_ANON_KEY to .env to enable cloud sync.
            </Text>
          ) : !signedIn ? (
            <List.Item
              title="Sign in to sync"
              description="Connect your Supabase account to back up your health data"
              left={() => <List.Icon icon="account-key-outline" />}
              onPress={() => setShowAuth(true)}
            />
          ) : (
            <>
              <List.Item
                title={`Signed in as ${authUser?.email ?? ''}`}
                description="Your health data syncs to your account"
                left={() => <List.Icon icon="account-check-outline" />}
              />
              <List.Item
                title="Sync now"
                description="Push today's metrics, meals and workouts"
                left={() => <List.Icon icon="sync" />}
                onPress={() => doSync(false)}
                disabled={!syncEnabled || syncing}
              />
              <List.Item
                title="Sync all history"
                description="Push every record to the cloud"
                left={() => <List.Icon icon="cloud-upload-outline" />}
                onPress={() => doSync(true)}
                disabled={!syncEnabled || syncing}
              />
              <List.Item
                title="Sign out"
                description="Stop syncing on this device"
                left={() => <List.Icon icon="logout" />}
                onPress={signOut}
              />
            </>
          )}
          <List.Item
            title="Auto-sync"
            description="Push new data to the cloud automatically"
            left={() => <List.Icon icon={syncEnabled ? 'cloud-check-outline' : 'cloud-outline'} />}
            right={() => (
              <Switch
                value={syncEnabled}
                onValueChange={setSyncEnabled}
                disabled={!configured}
              />
            )}
          />
          {syncStatus ? (
            <Text variant="bodySmall" style={[styles.syncStatus, { color: theme.colors.onSurfaceVariant }]}>
              {syncStatus}
            </Text>
          ) : null}
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            About
          </Text>
          <View style={styles.aboutRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              lif.os · version {version}
            </Text>
          </View>
          <Text variant="bodySmall" style={[styles.aboutNote, { color: theme.colors.onSurfaceVariant }]}>
            Data is stored on this device. Blood test values and medical notes are encrypted with
            AES-256 and can only be read after you enter your passcode; other entries are protected by
            the lock screen but not encrypted on disk. Metrics, meals and workouts go to the cloud only
            if you sign in and turn on sync.
          </Text>
        </Card.Content>
      </Card>

      <Portal>
        <ChangePasswordModal
          visible={showChangePassword}
          onDismiss={() => setShowChangePassword(false)}
        />
      </Portal>
      <Portal>
        <SupabaseAuthModal
          visible={showAuth}
          onDismiss={() => setShowAuth(false)}
        />
      </Portal>
    </Screen>
  );
}

function SupabaseAuthModal({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const theme = useTheme();
  const error = useSupabaseAuthStore((s) => s.error);
  const busy = useSupabaseAuthStore((s) => s.busy);
  const signIn = useSupabaseAuthStore((s) => s.signIn);
  const signUp = useSupabaseAuthStore((s) => s.signUp);
  const clearError = useSupabaseAuthStore((s) => s.clearError);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    const ok = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    if (ok) {
      onDismiss();
      setEmail('');
      setPassword('');
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {mode === 'signin' ? 'Sign in' : 'Create account'}
      </Text>
      <Text variant="bodySmall" style={[styles.modalHint, { color: theme.colors.onSurfaceVariant }]}>
        {mode === 'signin'
          ? 'Back up and restore your health data across devices.'
          : 'One account for your health data. Blood reports stay on this device only.'}
      </Text>
      <TextInput
        mode="outlined"
        label="Email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          clearError();
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.field}
      />
      <TextInput
        mode="outlined"
        label="Password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          clearError();
        }}
        secureTextEntry
        style={styles.field}
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
      <View style={styles.modalActions}>
        <Button mode="text" onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Create account' : 'Sign in'}
        </Button>
        <Button
          mode="contained"
          onPress={submit}
          loading={busy}
          disabled={busy || !email || !password}
        >
          {mode === 'signin' ? 'Sign in' : 'Create'}
        </Button>
      </View>
    </Modal>
  );
}

function ChangePasswordModal({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const theme = useTheme();
  const changePassword = useAuthStore((s) => s.changePassword);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== next;

  const save = async () => {
    if (mismatch) return;
    setBusy(true);
    const ok = await changePassword(current, next);
    setBusy(false);
    if (ok) {
      onDismiss();
      setCurrent('');
      setNext('');
      setConfirm('');
      Alert.alert('Passcode changed', 'All encrypted data was re-encrypted with the new key.');
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        Change passcode
      </Text>
      <Text variant="bodySmall" style={[styles.modalHint, { color: theme.colors.onSurfaceVariant }]}>
        Your medical data will be re-encrypted with the new key. This happens locally.
      </Text>
      <TextInput
        mode="outlined"
        label="Current passcode"
        value={current}
        onChangeText={(v) => {
          setCurrent(v);
          clearError();
        }}
        secureTextEntry
        style={styles.field}
      />
      <TextInput
        mode="outlined"
        label="New passcode"
        value={next}
        onChangeText={setNext}
        secureTextEntry
        style={styles.field}
      />
      <TextInput
        mode="outlined"
        label="Confirm new passcode"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        style={styles.field}
      />
      <HelperText type="error" visible={!!mismatch}>
        Passcodes do not match.
      </HelperText>
      <HelperText type="error" visible={!!error && !mismatch}>
        {error}
      </HelperText>
      <View style={styles.modalActions}>
        <Button mode="text" onPress={onDismiss}>
          Cancel
        </Button>
        <Button mode="contained" onPress={save} loading={busy} disabled={busy || !current || !next || mismatch}>
          Update
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12, borderRadius: 16, elevation: 1 },
  syncStatus: { marginTop: 4, marginHorizontal: 16, marginBottom: 8, lineHeight: 18 },
  aboutRow: { marginTop: 6 },
  aboutNote: { marginTop: 6, lineHeight: 18 },
  modal: { margin: 24, borderRadius: 18, padding: 20 },
  modalHint: { marginTop: 4, marginBottom: 8 },
  field: { marginTop: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 },
});
