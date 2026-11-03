import { Alert, Platform } from 'react-native';

/** Destructive confirm that works on native (Alert) and web (window.confirm). */
export function confirmDestructive(title: string, message: string, onConfirm: () => void, confirmLabel = 'Delete'): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
