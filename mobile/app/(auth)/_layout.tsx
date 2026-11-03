import { Redirect, Stack, useSegments, type Href } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { isAccountRequired, useSupabaseAuthStore } from '@/stores/supabase-auth';
import { useTheme } from '@/constants/theme';

/** Order: account (if Supabase is configured) → passcode setup/unlock → tabs. */
export default function AuthLayout() {
  const { c } = useTheme();
  const status = useAuthStore((s) => s.status);
  const accountStatus = useSupabaseAuthStore((s) => s.status);
  const segments = useSegments() as string[];
  const onAccount = segments[segments.length - 1] === 'account';
  const needsAccount = isAccountRequired() && accountStatus !== 'signedIn';

  if (needsAccount && !onAccount) return <Redirect href={'/(auth)/account' as Href} />;
  if (!needsAccount && onAccount) return <Redirect href={'/(auth)' as Href} />;
  if (status === 'unlocked' && !needsAccount) return <Redirect href={'/(tabs)' as Href} />;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: c.canvas } }} />;
}
