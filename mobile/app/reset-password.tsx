import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ACCOUNT_PASSWORD_MIN as MIN, useSupabaseAuthStore } from '@/stores/supabase-auth';
import { GlassCard } from '@/components/GlassCard';
import { palette, radii, spacing } from '@/constants/theme';

/**
 * Target of the password-reset email (lifos://reset-password?code=...).
 * Lives outside (auth)/(tabs) so their account/passcode redirects don't fire mid-reset.
 */
export default function ResetPasswordScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const busy = useSupabaseAuthStore((s) => s.busy);
  const error = useSupabaseAuthStore((s) => s.error);
  const begin = useSupabaseAuthStore((s) => s.beginPasswordRecovery);
  const updatePassword = useSupabaseAuthStore((s) => s.updatePassword);
  const clearError = useSupabaseAuthStore((s) => s.clearError);

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
    begin(params.code).then((ok) => setPhase(ok ? 'ready' : 'failed'));
  }, [begin, params.code]);

  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;
  const tooShort = password.length > 0 && password.length < MIN;
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async () => {
    if (await updatePassword(password)) router.replace('/' as Href);
  };

  const done = () => {
    clearError();
    router.replace('/' as Href);
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: ink }]}>Reset password</Text>
            <GlassCard contentStyle={styles.form}>
              {phase === 'verifying' && <ActivityIndicator color={palette.vermillion} />}

              {phase === 'failed' && (
                <>
                  <Text style={{ color: muted }}>
                    {params.error_description ??
                      error ??
                      'This reset link is invalid or expired. Open it on the phone you requested it from, or request a new one.'}
                  </Text>
                  <Button mode="contained" onPress={done} buttonColor={palette.vermillion} textColor="#fff" style={styles.button}>
                    Back to sign in
                  </Button>
                </>
              )}

              {phase === 'ready' && (
                <>
                  <TextInput
                    label="New password"
                    mode="outlined"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    outlineColor={palette.chromeWhite}
                    activeOutlineColor={palette.vermillion}
                    style={styles.input}
                  />
                  <TextInput
                    label="Confirm password"
                    mode="outlined"
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry
                    autoCapitalize="none"
                    outlineColor={palette.chromeWhite}
                    activeOutlineColor={palette.vermillion}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={tooShort || mismatch || !!error}>
                    {tooShort ? `Minimum ${MIN} characters.` : mismatch ? 'Passwords do not match.' : error}
                  </HelperText>
                  <Button
                    mode="contained"
                    onPress={submit}
                    loading={busy}
                    disabled={busy || password.length < MIN || confirm !== password}
                    buttonColor={palette.vermillion}
                    textColor="#fff"
                    style={styles.button}>
                    Save password
                  </Button>
                </>
              )}
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  form: { gap: 4 },
  input: { marginTop: 6, backgroundColor: 'transparent' },
  button: { marginTop: 10, borderRadius: radii.md },
});
