import '@/services/crypto-polyfill'; // must stay first
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';

import { themeFor, useThemeMode } from '@/constants/theme';
import { DotMatrix, Text, ToastHost } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { useSupabaseAuthStore } from '@/stores/supabase-auth';
import { useSettingsStore } from '@/stores/settings';
import { getDb } from '@/services/database';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const mode = useThemeMode();
  const t = themeFor(mode);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const authInit = useAuthStore((s) => s.init);
  const accountStatus = useSupabaseAuthStore((s) => s.status);
  const accountInit = useSupabaseAuthStore((s) => s.init);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const loadSettings = useSettingsStore((s) => s.load);
  const [bootError, setBootError] = useState<string | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    // Boot must never hard-fail: each step degrades on its own so the app
    // always reaches the unlock screen instead of a blank splash or a crash.
    authInit().catch((e) => {
      console.error('Auth init failed:', e);
      setBootError('Could not read your passcode from secure storage.');
    });
    accountInit().catch((e) => console.error('Account init failed:', e));
    loadSettings().catch((e) => console.error('Settings load failed:', e));
    getDb().catch((e) => {
      console.error('DB init failed:', e);
      setBootError('Could not open the local database.');
    });
  }, [authInit, accountInit, loadSettings]);

  // A font failure falls back to system fonts rather than blocking boot.
  const ready = bootstrapped && settingsLoaded && accountStatus !== 'uninitialized' && (fontsLoaded || !!fontError);

  const nav = mode === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = { ...nav, colors: { ...nav.colors, background: t.c.canvas, card: t.c.canvas, text: t.c.ink, border: t.c.line } };

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        {ready ? (
          <ThemeProvider value={navTheme}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.c.canvas }, animation: 'fade' }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="reset-password" options={{ animation: 'slide_from_bottom' }} />
            </Stack>
            <ToastHost />
          </ThemeProvider>
        ) : (
          <View style={[styles.splash, { backgroundColor: t.c.canvas }]}>
            <DotMatrix text="LIF.OS" dot={7} />
            {bootError ? (
              <Text muted center style={styles.splashError}>
                {bootError}
              </Text>
            ) : null}
          </View>
        )}
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  splashError: { marginHorizontal: 32 },
});
