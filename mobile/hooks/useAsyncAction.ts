import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/utils/helpers';

/**
 * One busy/error pair for a screen action (save, delete, unlock…).
 * `busy` always resets in `finally`, so a thrown error can never leave a
 * button disabled. A second call while busy is ignored (double-tap guard).
 * Returns the task's result, or undefined if it threw or was skipped.
 */
export function useAsyncAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const run = useCallback(async <T>(task: () => Promise<T>, fallback?: string): Promise<T | undefined> => {
    if (running.current) return undefined;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      return await task();
    } catch (e) {
      if (mounted.current) setError(errorMessage(e, fallback));
      return undefined;
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  return { busy, error, setError, run };
}
