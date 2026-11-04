import { Platform, TurboModuleRegistry } from 'react-native';

/**
 * True only on Android builds that include the widget native module
 * (dev build / APK). Expo Go and web don't, and importing the library there
 * would crash, so every use goes through this check + a lazy require.
 */
export const homeWidgetsAvailable = (): boolean => Platform.OS === 'android' && TurboModuleRegistry.get('AndroidWidget') != null;

let timer: ReturnType<typeof setTimeout> | null = null;

/** Redraw placed home-screen widgets after data changes (debounced; never throws). */
export function refreshHomeWidgets(): void {
  if (!homeWidgetsAvailable()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { WIDGET_NAMES, renderHomeWidget } = require('./task-handler') as typeof import('./task-handler');
      for (const widgetName of WIDGET_NAMES) {
        void requestWidgetUpdate({ widgetName, renderWidget: (info) => renderHomeWidget(widgetName, info.width) }).catch(() => undefined);
      }
    } catch (e) {
      console.warn('Home widget refresh failed:', e);
    }
  }, 800);
}
