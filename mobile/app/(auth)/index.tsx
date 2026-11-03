import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, MIN_PASSWORD_LENGTH } from '@/stores/auth';
import { GlassCard } from '@/components/GlassCard';
import { palette, radii, spacing } from '@/constants/theme';

export default function AuthIndex() {
  const theme = useTheme();
  const status = useAuthStore((s) => s.status);
  const setup = useAuthStore((s) => s.setup);
  const unlock = useAuthStore((s) => s.unlock);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const isFirstTime = status === 'uninitialized';
  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;

  const mismatch = isFirstTime && confirm.length > 0 && confirm !== password;

  const onSubmit = async () => {
    clearError();
    setBusy(true);
    if (isFirstTime) {
      await setup(password);
    } else {
      await unlock(password);
    }
    setBusy(false);
  };

  const disabled =
    busy || !password || (isFirstTime && (password.length < MIN_PASSWORD_LENGTH || !!mismatch));

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.logoWrap}>
              <View style={styles.logo}>
                <MaterialCommunityIcons name="lock-outline" size={36} color="#fff" />
              </View>
              <Text style={[styles.title, { color: ink }]}>lif.os</Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                {isFirstTime
                  ? 'Your private health tracker. Data stays on this device.'
                  : 'Unlock to access your health data'}
              </Text>
            </View>

            <GlassCard contentStyle={styles.form}>
              <TextInput
                label="Passcode"
                mode="outlined"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  clearError();
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoFocus
                outlineColor={palette.chromeWhite}
                activeOutlineColor={palette.vermillion}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword((v) => !v)}
                  />
                }
                style={styles.input}
                onSubmitEditing={disabled ? undefined : onSubmit}
              />

              {isFirstTime && (
                <>
                  <TextInput
                    label="Confirm passcode"
                    mode="outlined"
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    outlineColor={palette.chromeWhite}
                    activeOutlineColor={palette.vermillion}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={!!mismatch}>
                    Passcodes do not match.
                  </HelperText>
                  <HelperText type="info" visible={!mismatch && !error}>
                    Minimum {MIN_PASSWORD_LENGTH} characters.
                  </HelperText>
                </>
              )}

              <HelperText type="error" visible={!!error && !mismatch}>
                {error}
              </HelperText>

              <Button
                mode="contained"
                onPress={onSubmit}
                loading={busy}
                disabled={disabled}
                buttonColor={palette.vermillion}
                textColor="#fff"
                style={styles.button}
                contentStyle={styles.buttonContent}>
                {isFirstTime ? 'Create account' : 'Login'}
              </Button>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  subtitle: { textAlign: 'center', marginTop: 8, fontSize: 14, lineHeight: 20, maxWidth: 280 },
  form: { gap: 2 },
  input: { marginTop: 10, backgroundColor: 'transparent' },
  button: { marginTop: 12, borderRadius: radii.md },
  buttonContent: { paddingVertical: 6 },
});
