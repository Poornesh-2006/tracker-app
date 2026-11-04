import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { StreakHomeWidget, TodayHomeWidget } from './HomeWidgets';
import { loadStreak, loadTodaySnapshot } from './data';

export const WIDGET_NAMES = ['Today', 'Streak'] as const;

/** Builds the widget element for a placed widget (also used by the in-app refresh). */
export async function renderHomeWidget(name: string, width: number) {
  if (name === 'Streak') return <StreakHomeWidget data={await loadStreak()} width={width} />;
  return <TodayHomeWidget data={await loadTodaySnapshot()} width={width} />;
}

/**
 * Runs headless (app may be closed) when Android asks a widget to draw:
 * on add, on the periodic update and on resize.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetName, width } = props.widgetInfo;
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      try {
        props.renderWidget(await renderHomeWidget(widgetName, width));
      } catch (e) {
        console.error(`Widget ${widgetName} failed to render:`, e);
      }
      break;
    default:
      break;
  }
}
