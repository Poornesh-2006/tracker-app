import { Linking } from 'react-native';

/**
 * Opens a user-entered link safely: adds https:// when the scheme is missing,
 * only allows http(s), and reports failure instead of throwing.
 */
export async function openLink(raw: string): Promise<boolean> {
  const trimmed = raw.trim();
  const url = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
