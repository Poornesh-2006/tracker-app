import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth';
import { GlassCard } from '@/components/GlassCard';
import { palette, radii, spacing } from '@/constants/theme';

export default function UnlockScreen() {
  const theme = useTheme();
  const unlock = useAuthStore((s) => s.unlock);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;

  const onSubmit = async () => {
    if (!password) return;
    setBusy(true);
    await unlock(password);
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
                Unlock to access your health data
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
                onSubmitEditing={onSubmit}
              />
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
              <Button
                mode="contained"
                onPress={onSubmit}
                loading={busy}
                disabled={busy || !password}
                buttonColor={palette.vermillion}
                textColor="#fff"
                style={styles.button}
                contentStyle={styles.buttonContent}>
                Unlock
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
  subtitle: { textAlign: 'center', marginTop: 8, fontSize: 14 },
  form: {},
  input: { marginTop: 4, backgroundColor: 'transparent' },
  button: { marginTop: 12, borderRadius: radii.md },
  buttonContent: { paddingVertical: 6 },
});
