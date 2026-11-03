import { create } from 'zustand';
import { getSettings, setSetting } from '@/services/settings-service';
import type { AppSettings } from '@/types';

interface SettingsState {
  theme: AppSettings['theme'];
  units: AppSettings['units'];
  syncEnabled: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  setTheme: (theme: AppSettings['theme']) => Promise<void>;
  setUnits: (units: AppSettings['units']) => Promise<void>;
  setSyncEnabled: (enabled: boolean) => Promise<void>;
}

async function persist(key: keyof AppSettings, value: string): Promise<void> {
  try {
    await setSetting(key, value);
  } catch (e) {
    console.error(`Saving setting "${key}" failed:`, e);
  }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'system',
  units: 'metric',
  syncEnabled: false,
  loaded: false,

  load: async () => {
    try {
      const settings = await getSettings();
      set({
        theme: settings.theme,
        units: settings.units,
        syncEnabled: settings.syncEnabled,
        loaded: true,
      });
    } catch (e) {
      // Fall back to defaults rather than blocking boot on a storage failure.
      console.error('Settings load failed, using defaults:', e);
      set({ loaded: true });
    }
  },

  // Optimistic: the UI updates even if persisting fails (logged; retried on next change).
  setTheme: async (theme) => {
    set({ theme });
    await persist('theme', theme);
  },

  setUnits: async (units) => {
    set({ units });
    await persist('units', units);
  },

  setSyncEnabled: async (enabled) => {
    set({ syncEnabled: enabled });
    await persist('syncEnabled', String(enabled));
  },
}));
