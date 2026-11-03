import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * One place for picking images. Returns a local URI, or null if the user
 * cancelled / denied permission. Camera falls back to the library on web.
 */
export async function pickPhoto(source: 'library' | 'camera' = 'library'): Promise<string | null> {
  if (source === 'camera' && Platform.OS !== 'web') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    const shot = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    return shot.canceled ? null : (shot.assets[0]?.uri ?? null);
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  return res.canceled ? null : (res.assets[0]?.uri ?? null);
}
