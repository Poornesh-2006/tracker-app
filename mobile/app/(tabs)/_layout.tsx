import { useState } from 'react';
import { Redirect, Tabs, type Href } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { isAccountRequired, useSupabaseAuthStore } from '@/stores/supabase-auth';
import { TabBar } from '@/components/nav/TabBar';
import { QuickAdd } from '@/components/nav/QuickAdd';

export default function TabLayout() {
  const status = useAuthStore((s) => s.status);
  const accountStatus = useSupabaseAuthStore((s) => s.status);
  const [plusOpen, setPlusOpen] = useState(false);

  if (isAccountRequired() && accountStatus !== 'signedIn') return <Redirect href={'/(auth)/account' as Href} />;
  if (status !== 'unlocked') return <Redirect href={(status === 'uninitialized' ? '/(auth)/welcome' : '/(auth)/unlock') as Href} />;

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false, animation: 'shift' }}
        tabBar={(props) => <TabBar {...props} plusOpen={plusOpen} onPlus={() => setPlusOpen((o) => !o)} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="health" />
        <Tabs.Screen name="plan" />
        <Tabs.Screen name="brain" />
        <Tabs.Screen name="me" />
      </Tabs>
      <QuickAdd open={plusOpen} onClose={() => setPlusOpen(false)} />
    </>
  );
}
