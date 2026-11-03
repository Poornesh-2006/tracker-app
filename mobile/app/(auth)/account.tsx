import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AuthShell } from '@/components/nav/AuthShell';
import { Button, Field, Segmented, Text } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { ACCOUNT_PASSWORD_MIN, useSupabaseAuthStore } from '@/stores/supabase-auth';

type Mode = 'signin' | 'signup';
const MODES = [
  { value: 'signin' as Mode, label: 'Sign in' },
  { value: 'signup' as Mode, label: 'Create account' },
];

export default function AccountScreen() {
  const { c } = useTheme();
  const { error, notice, busy, signIn, signUp, signInWithGoogle, resetPassword, clearError } = useSupabaseAuthStore();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => clearError, [clearError]);

  const isSignIn = mode === 'signin';
  const tooShort = !isSignIn && password.length > 0 && password.length < ACCOUNT_PASSWORD_MIN;
  const e = email.trim();
  const canSubmit = !!e && !!password && !tooShort && !busy;

  const submit = () => {
    if (!canSubmit) return;
    void (isSignIn ? signIn(e, password) : signUp(e, password));
  };

  return (
    <AuthShell title={isSignIn ? 'Sign in.' : 'Join lif.os.'} subtitle="Your account backs up metrics, meals and workouts when you turn sync on.">
      <Segmented
        options={MODES}
        value={mode}
        onChange={(m) => {
          setMode(m);
          clearError();
        }}
      />
      <Button label="Continue with Google" kind="ghost" icon="google" onPress={() => void signInWithGoogle()} disabled={busy} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
        <Text variant="label" muted>
          or email
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
      </View>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secure
        onSubmit={submit}
        error={tooShort ? `At least ${ACCOUNT_PASSWORD_MIN} characters.` : error}
      />
      {notice ? (
        <Text variant="small" color={c.success} accessibilityRole="alert">
          {notice}
        </Text>
      ) : null}
      <Button label={isSignIn ? 'Sign in' : 'Create account'} onPress={submit} disabled={!canSubmit} loading={busy} />
      {isSignIn ? <Button label="Forgot password?" kind="ghost" small onPress={() => void resetPassword(e)} disabled={busy} /> : null}
    </AuthShell>
  );
}
