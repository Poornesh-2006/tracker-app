import { Redirect, type Href } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

/** Entry: first run → create a passcode, otherwise unlock. */
export default function AuthIndex() {
  const status = useAuthStore((s) => s.status);
  return <Redirect href={(status === 'uninitialized' ? '/(auth)/welcome' : '/(auth)/unlock') as Href} />;
}
