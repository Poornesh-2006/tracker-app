import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, MIN_PASSWORD_LENGTH } from '@/stores/auth';
import { GlassCard } from '@/components/GlassCard';
import { palette, radii, spacing } from '@/constants/theme';

export default function WelcomeScreen() {
  const theme = useTheme();
  const setup = useAuthStore((s) => s.setup);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;
  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;

  const onSubmit = async () => {
    clearError();
    if (password !== confirm) return;
    setBusy(true);
    await setup(password);
    setBusy(false);
  };

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
                Your private health tracker. Data stays on this device.
              </Text>
            </View>

            <GlassCard contentStyle={styles.form}>
              <Text style={[styles.formTitle, { color: ink }]}>Create a passcode</Text>
              <Text style={[styles.formHint, { color: muted }]}>
                Locks the app and encrypts medical data with AES-256. If you forget it, encrypted data cannot be recovered.
              </Text>

              <TextInput
                label="Passcode"
                mode="outlined"
                value={password}
                onChangeText={setPassword}
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
              />
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
              <HelperText type="error" visible={!!error && !mismatch}>
                {error}
              </HelperText>
              <HelperText type="info" visible={!error && !mismatch}>
                Minimum {MIN_PASSWORD_LENGTH} characters.
              </HelperText>

              <Button
                mode="contained"
                onPress={onSubmit}
                loading={busy}
                disabled={busy || password.length < MIN_PASSWORD_LENGTH || mismatch}
                buttonColor={palette.vermillion}
                textColor="#fff"
                style={styles.button}
                contentStyle={styles.buttonContent}>
                Get started
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
  formTitle: { fontSize: 18, fontWeight: '700' },
  formHint: { fontSize: 13, lineHeight: 18, marginTop: 4, marginBottom: 8 },
  input: { marginTop: 10, backgroundColor: 'transparent' },
  button: { marginTop: 12, borderRadius: radii.md },
  buttonContent: { paddingVertical: 6 },
});
