import '@/services/crypto-polyfill'; // must stay first
import { useEffect, useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { ActivityIndicator, PaperProvider, Text } from 'react-native-paper';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getTheme } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth';
import { useSupabaseAuthStore } from '@/stores/supabase-auth';
import { useSettingsStore } from '@/stores/settings';
import { getDb } from '@/services/database';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const authInit = useAuthStore((s) => s.init);
  const accountStatus = useSupabaseAuthStore((s) => s.status);
  const accountInit = useSupabaseAuthStore((s) => s.init);
  const themePref = useSettingsStore((s) => s.theme);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const loadSettings = useSettingsStore((s) => s.load);

  const [bootError, setBootError] = useState<string | null>(null);

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

  const effectiveMode =
    themePref === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themePref;
  const paperTheme = getTheme(effectiveMode);
  const navTheme = effectiveMode === 'dark' ? DarkTheme : DefaultTheme;

  if (!bootstrapped || !settingsLoaded || accountStatus === 'uninitialized') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#EB5E28" />
        {bootError ? <Text style={styles.splashError}>{bootError}</Text> : null}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={navTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style={effectiveMode === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFCF2',
  },
  splashError: {
    marginTop: 16,
    marginHorizontal: 32,
    textAlign: 'center',
    color: '#8A4B2A',
    fontSize: 13,
  },
});
