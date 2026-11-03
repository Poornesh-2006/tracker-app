import { Redirect, Tabs, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth';
import { isAccountRequired, useSupabaseAuthStore } from '@/stores/supabase-auth';
import { palette } from '@/constants/theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

function tabIcon(name: IconName, prominent = false) {
  return function TabIcon({ color, size }: { color: string; size: number }) {
    if (prominent) {
      return (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            marginTop: -10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: color === palette.vermillion ? palette.vermillion : palette.masala,
          }}>
          <MaterialCommunityIcons name={name} size={24} color="#fff" />
        </View>
      );
    }
    return <MaterialCommunityIcons name={name} size={size} color={color} />;
  };
}

export default function TabLayout() {
  const status = useAuthStore((s) => s.status);
  const accountStatus = useSupabaseAuthStore((s) => s.status);
  const theme = useTheme();
  const isDark = theme.dark;

  if (isAccountRequired() && accountStatus !== 'signedIn') {
    return <Redirect href={'/(auth)/account' as Href} />;
  }

  if (status !== 'unlocked') {
    return <Redirect href={status === 'uninitialized' ? '/(auth)/welcome' : '/(auth)/unlock'} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.vermillion,
        tabBarInactiveTintColor: isDark ? palette.chromeWhite : palette.masala,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: theme.colors.surface,
          borderTopColor: isDark ? 'rgba(204,197,185,0.15)' : 'rgba(204,197,185,0.45)',
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          height: 76,
          paddingBottom: 13,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
      }}>
      <Tabs.Screen
        name="todo"
        options={{ title: 'Todo', tabBarIcon: tabIcon('checkbox-marked-outline') }}
      />
      <Tabs.Screen name="brain" options={{ title: 'Brain', tabBarIcon: tabIcon('brain') }} />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: tabIcon('heart-pulse', true),
          tabBarLabel: 'Health',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: tabIcon('calendar-month-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('account-star-outline') }}
      />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: tabIcon('store-outline') }} />

      {/* Legacy screens kept for deep links / reuse — hidden from tab bar */}
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="medical" options={{ href: null }} />
      <Tabs.Screen name="food" options={{ href: null }} />
      <Tabs.Screen name="workouts" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
