import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { AuthShell } from '@/components/nav/AuthShell';
import { Button, Field, Text } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { ACCOUNT_PASSWORD_MIN as MIN, useSupabaseAuthStore } from '@/stores/supabase-auth';

/**
 * Target of the password-reset email (lifos://reset-password?code=...).
 * Lives outside (auth)/(tabs) so their redirects don't fire mid-reset.
 */
export default function ResetPasswordScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const { busy, error, beginPasswordRecovery, updatePassword, clearError } = useSupabaseAuthStore();
  const [phase, setPhase] = useState<'verifying' | 'ready' | 'failed'>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const started = useRef(false);

  useEffect(() => {
    // The code is single-use; guard against double-run.
    if (started.current) return;
    started.current = true;
    if (typeof params.code !== 'string') {
      setPhase('failed');
      return;
    }
    void beginPasswordRecovery(params.code).then((ok) => setPhase(ok ? 'ready' : 'failed'));
  }, [beginPasswordRecovery, params.code]);

  const tooShort = password.length > 0 && password.length < MIN;
  const mismatch = confirm.length > 0 && confirm !== password;
  const home = () => {
    clearError();
    router.replace('/' as Href);
  };
  const submit = async () => {
    if (await updatePassword(password)) router.replace('/' as Href);
  };

  return (
    <AuthShell title="Reset password" clock={false}>
      {phase === 'verifying' ? <ActivityIndicator color={c.ink} /> : null}
      {phase === 'failed' ? (
        <>
          <Text muted>
            {params.error_description ?? error ?? 'This reset link is invalid or expired. Open it on the phone you requested it from, or request a new one.'}
          </Text>
          <Button label="Back to sign in" onPress={home} />
        </>
      ) : null}
      {phase === 'ready' ? (
        <>
          <Field label="New password" value={password} onChangeText={setPassword} secure autoFocus error={tooShort ? `At least ${MIN} characters.` : null} />
          <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secure error={mismatch ? 'Passwords don’t match.' : error} />
          <Button label="Save password" onPress={() => void submit()} loading={busy} disabled={password.length < MIN || confirm !== password} />
        </>
      ) : null}
    </AuthShell>
  );
}
