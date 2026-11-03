import { toast } from '@/components/ui';
import { bumpData } from '@/hooks/useDataVersion';
import { addHydration } from '@/services/hydration-service';
import { confirmDestructive } from '@/utils/confirm';
import { errorMessage } from '@/utils/helpers';

/**
 * Runs a quick action (toggle, status change…), refreshes screens on success
 * and turns failures into a toast instead of a silent unhandled rejection.
 */
export async function attempt(fn: () => Promise<unknown>, failMessage = 'Something went wrong.'): Promise<boolean> {
  try {
    await fn();
    bumpData();
    return true;
  } catch (e) {
    toast(errorMessage(e, failMessage), 'alert-circle');
    return false;
  }
}

let waterInFlight = false;

/** Logs water from any screen. Ignores taps while a write is in flight (double-tap guard). */
export async function logWater(date: string, ml: number): Promise<void> {
  if (waterInFlight) return;
  waterInFlight = true;
  try {
    if (await attempt(() => addHydration(date, ml), 'Could not log water.')) toast(`+${ml} ml water`, 'cup-water');
  } finally {
    waterInFlight = false;
  }
}

/** Confirm, delete, refresh every screen, then `after` (e.g. close the sheet). */
export function askDelete(name: string, remove: () => Promise<unknown>, after?: () => void): void {
  confirmDestructive(`Delete ${name}?`, 'This can’t be undone.', async () => {
    if (await attempt(remove, 'Could not delete.')) {
      toast('Deleted', 'delete');
      after?.();
    }
  });
}
