import { useState } from 'react';
import { AuthShell } from '@/components/nav/AuthShell';
import { Button, Field, Text } from '@/components/ui';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { MIN_PASSWORD_LENGTH, useAuthStore } from '@/stores/auth';

export default function WelcomeScreen() {
  const setup = useAuthStore((s) => s.setup);
  const storeError = useAuthStore((s) => s.error);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { busy, run } = useAsyncAction();

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= MIN_PASSWORD_LENGTH && confirm === password;

  const submit = () => canSubmit && run(() => setup(password));

  return (
    <AuthShell title="Make it yours." subtitle="Create a passcode. It locks the app and encrypts your medical data on this phone.">
      <Field label="Passcode" value={password} onChangeText={setPassword} secure autoFocus error={tooShort ? `At least ${MIN_PASSWORD_LENGTH} characters.` : null} />
      <Field label="Confirm passcode" value={confirm} onChangeText={setConfirm} secure onSubmit={submit} error={mismatch ? 'Passcodes don’t match.' : storeError} />
      <Button label="Create passcode" icon="lock-outline" onPress={submit} disabled={!canSubmit} loading={busy} />
      <Text variant="small" muted center>
        There’s no recovery: if you forget it, encrypted data can’t be read.
      </Text>
    </AuthShell>
  );
}
