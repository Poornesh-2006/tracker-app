import { useEffect, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { AuthShell } from '@/components/nav/AuthShell';
import { Button, Field, haptic } from '@/components/ui';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useAuthStore } from '@/stores/auth';
import { confirmDestructive } from '@/utils/confirm';

export default function UnlockScreen() {
  const unlock = useAuthStore((s) => s.unlock);
  const resetAll = useAuthStore((s) => s.resetAll);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const [password, setPassword] = useState('');
  const { busy, run } = useAsyncAction();
  const shake = useSharedValue(0);

  useEffect(() => clearError, [clearError]);

  const submit = () =>
    password &&
    run(async () => {
      const ok = await unlock(password);
      if (!ok) {
        haptic('warning');
        shake.value = withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-6, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        );
        setPassword('');
      }
    });

  const forgot = () =>
    confirmDestructive(
      'Reset lif.os?',
      'Without your passcode, encrypted data can’t be recovered. This erases ALL data on this phone and starts fresh.',
      () => void resetAll(),
      'Erase everything',
    );

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <AuthShell title="Welcome back." subtitle="Enter your passcode to unlock.">
      <Animated.View style={shakeStyle}>
        <Field label="Passcode" value={password} onChangeText={setPassword} secure autoFocus onSubmit={submit} error={error} />
      </Animated.View>
      <Button label="Unlock" icon="lock-open-variant-outline" onPress={submit} disabled={!password} loading={busy} />
      <Button label="Forgot passcode?" kind="ghost" small onPress={forgot} />
    </AuthShell>
  );
}
