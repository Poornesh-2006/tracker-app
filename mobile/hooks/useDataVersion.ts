import { create } from 'zustand';
import { refreshHomeWidgets } from '@/widgets/refresh';

/**
 * Global "local data changed" counter. Every save/delete bumps it and every
 * useFocusData screen reloads, so a quick-add from the + sheet shows up on the
 * screen underneath without manual refresh plumbing.
 */
export const useDataVersion = create<{ version: number; bump: () => void }>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

/** After any save/delete: refresh visible screens and redraw Android home-screen widgets. */
export const bumpData = () => {
  useDataVersion.getState().bump();
  refreshHomeWidgets();
};
