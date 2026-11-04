import 'expo-router/entry';
import { homeWidgetsAvailable } from './widgets/refresh';

// Android home-screen widgets: register the headless renderer only where the
// native module exists (dev build / APK). Expo Go and web skip this entirely.
if (homeWidgetsAvailable()) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerWidgetTaskHandler } = require('react-native-android-widget') as typeof import('react-native-android-widget');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  registerWidgetTaskHandler((require('./widgets/task-handler') as typeof import('./widgets/task-handler')).widgetTaskHandler);
}
