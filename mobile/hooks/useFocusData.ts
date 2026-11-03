import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { errorMessage } from '@/utils/helpers';

/**
 * Loads screen data every time the screen gains focus (so edits made on other
 * screens show up) and exposes `reload` for pull-to-refresh / after saves.
 * Pass a memoized loader: `useFocusData(useCallback(() => listX(date), [date]))`.
 * Results from a stale load (screen blurred, or a newer load started) are dropped.
 */
export function useFocusData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++generation.current;
    setLoading(true);
    try {
      const result = await load();
      if (mine === generation.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (mine === generation.current) setError(errorMessage(e, 'Could not load data.'));
    } finally {
      if (mine === generation.current) setLoading(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void reload();
      return () => {
        generation.current++; // blur: ignore in-flight results
      };
    }, [reload]),
  );

  return { data, loading, error, reload };
}
