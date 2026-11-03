import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ACCOUNT_PASSWORD_MIN, useSupabaseAuthStore } from '@/stores/supabase-auth';
import { GlassCard } from '@/components/GlassCard';
import { palette, radii, spacing } from '@/constants/theme';

export default function AccountScreen() {
  const theme = useTheme();
  const error = useSupabaseAuthStore((s) => s.error);
  const notice = useSupabaseAuthStore((s) => s.notice);
  const busy = useSupabaseAuthStore((s) => s.busy);
  const signIn = useSupabaseAuthStore((s) => s.signIn);
  const signUp = useSupabaseAuthStore((s) => s.signUp);
  const signInWithGoogle = useSupabaseAuthStore((s) => s.signInWithGoogle);
  const resetPassword = useSupabaseAuthStore((s) => s.resetPassword);
  const clearError = useSupabaseAuthStore((s) => s.clearError);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;
  const isSignIn = mode === 'signin';
  const tooShort = !isSignIn && password.length > 0 && password.length < ACCOUNT_PASSWORD_MIN;

  const submit = async () => {
    const e = email.trim();
    if (isSignIn) await signIn(e, password);
    else await signUp(e, password);
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.logoWrap}>
              <View style={styles.logo}>
                <MaterialCommunityIcons name="account-outline" size={36} color="#fff" />
              </View>
              <Text style={[styles.title, { color: ink }]}>lif.os</Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                {isSignIn ? 'Sign in to your account' : 'Create your account'}
              </Text>
            </View>

            <GlassCard contentStyle={styles.form}>
              <Button
                mode="outlined"
                icon="google"
                onPress={signInWithGoogle}
                disabled={busy}
                textColor={ink}
                style={styles.google}
                contentStyle={styles.buttonContent}>
                Continue with Google
              </Button>

              <View style={styles.dividerRow}>
                <Divider style={styles.flex} />
                <Text style={[styles.or, { color: muted }]}>or</Text>
                <Divider style={styles.flex} />
              </View>

              <TextInput
                label="Email"
                mode="outlined"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  clearError();
                }}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                outlineColor={palette.chromeWhite}
                activeOutlineColor={palette.vermillion}
                style={styles.input}
              />
              <TextInput
                label="Password"
                mode="outlined"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  clearError();
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                outlineColor={palette.chromeWhite}
                activeOutlineColor={palette.vermillion}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword((v) => !v)}
                  />
                }
                style={styles.input}
                onSubmitEditing={busy || !email || !password ? undefined : submit}
              />
              <HelperText type="error" visible={tooShort}>
                Minimum {ACCOUNT_PASSWORD_MIN} characters.
              </HelperText>
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
              <HelperText type="info" visible={!!notice}>
                {notice}
              </HelperText>

              <Button
                mode="contained"
                onPress={submit}
                loading={busy}
                disabled={busy || !email || !password || tooShort}
                buttonColor={palette.vermillion}
                textColor="#fff"
                style={styles.button}
                contentStyle={styles.buttonContent}>
                {isSignIn ? 'Sign in' : 'Create account'}
              </Button>

              <View style={styles.links}>
                <Button
                  mode="text"
                  compact
                  onPress={() => {
                    clearError();
                    setMode(isSignIn ? 'signup' : 'signin');
                  }}>
                  {isSignIn ? 'Create account' : 'I have an account'}
                </Button>
                {isSignIn && (
                  <Button mode="text" compact onPress={() => resetPassword(email.trim())}>
                    Forgot password?
                  </Button>
                )}
              </View>
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
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: palette.vermillion,
  },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: 0.5 },
  subtitle: { textAlign: 'center', marginTop: 8, fontSize: 14 },
  form: { gap: 2 },
  google: { borderRadius: radii.md },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  or: { fontSize: 12 },
  input: { marginTop: 6, backgroundColor: 'transparent' },
  button: { marginTop: 8, borderRadius: radii.md },
  buttonContent: { paddingVertical: 6 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});
