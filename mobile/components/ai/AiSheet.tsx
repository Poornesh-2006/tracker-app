import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button, Sheet, Text } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { errorMessage } from '@/utils/helpers';

/**
 * Asks the local AI (Gemma) and shows the answer. `ask` runs every time the
 * sheet opens; the result is never cached or stored.
 */
export function AiSheet({ open, onClose, title, ask }: { open: boolean; onClose: () => void; title: string; ask: () => Promise<string> }) {
  const { c } = useTheme();
  const [state, setState] = useState<{ loading: boolean; text: string | null; error: string | null }>({ loading: false, text: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setState({ loading: true, text: null, error: null });
    ask()
      .then((text) => alive && setState({ loading: false, text, error: null }))
      .catch((e) => alive && setState({ loading: false, text: null, error: errorMessage(e, 'Local AI did not answer.') }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attempt]);

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle="Local AI · runs on your network, not a diagnosis">
      {state.loading ? (
        <View style={{ paddingVertical: 32, alignItems: 'center', gap: 12 }}>
          <ActivityIndicator color={c.ink} />
          <Text muted>Thinking…</Text>
        </View>
      ) : null}
      {state.text ? <Text>{state.text}</Text> : null}
      {state.error ? (
        <View style={{ gap: 12 }}>
          <Text color={c.danger}>{state.error}</Text>
          <Button label="Try again" kind="ghost" icon="refresh" onPress={() => setAttempt((a) => a + 1)} />
        </View>
      ) : null}
    </Sheet>
  );
}
