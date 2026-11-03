import { create } from 'zustand';
import type { BloodTest, DailyMetrics, FoodLogEntry, WorkoutEntry } from '@/types';
import { listBloodTests } from '@/services/blood-test-service';
import { encryptionService } from '@/services/encryption';
import { caloriesForDate, listFoodByDate } from '@/services/meal-service';
import { listRecentMetrics } from '@/services/metrics-service';
import { listWorkouts } from '@/services/workout-service';
import { todayStr } from '@/utils/dates';

interface DataState {
  metrics: DailyMetrics[];
  bloodTests: BloodTest[];
  workouts: WorkoutEntry[];
  foodByDate: Record<string, FoodLogEntry[]>;
  caloriesByDate: Record<string, number>;
  foodDate: string;
  loaded: boolean;
  loading: boolean;
  setFoodDate: (date: string) => Promise<void>;
  loadDashboard: () => Promise<void>;
  loadFood: (date: string) => Promise<void>;
  reloadBloodTests: () => Promise<void>;
  reloadMetrics: () => Promise<void>;
  reloadWorkouts: () => Promise<void>;
  clear: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  metrics: [],
  bloodTests: [],
  workouts: [],
  foodByDate: {},
  caloriesByDate: {},
  foodDate: todayStr(),
  loaded: false,
  loading: false,

  loadDashboard: async () => {
    set({ loading: true });
    try {
      const today = todayStr();
      const [metrics, bloodTests, workouts, food, calories] = await Promise.all([
        listRecentMetrics(30),
        listBloodTests(50),
        listWorkouts(20),
        listFoodByDate(today),
        caloriesForDate(today),
      ]);
      // Locked while loading: don't repopulate decrypted data after clear().
      if (!encryptionService.isUnlocked()) return;
      set((s) => ({
        metrics,
        bloodTests,
        workouts,
        foodDate: today,
        foodByDate: { ...s.foodByDate, [today]: food },
        caloriesByDate: { ...s.caloriesByDate, [today]: calories },
        loaded: true,
      }));
    } finally {
      set({ loading: false });
    }
  },

  loadFood: async (date) => {
    const [food, calories] = await Promise.all([listFoodByDate(date), caloriesForDate(date)]);
    set((s) => ({
      foodDate: date,
      foodByDate: { ...s.foodByDate, [date]: food },
      caloriesByDate: { ...s.caloriesByDate, [date]: calories },
    }));
  },

  setFoodDate: async (date) => {
    await get().loadFood(date);
  },

  reloadBloodTests: async () => {
    const bloodTests = await listBloodTests(50);
    set({ bloodTests });
  },

  reloadMetrics: async () => {
    const metrics = await listRecentMetrics(30);
    set({ metrics });
  },

  reloadWorkouts: async () => {
    const workouts = await listWorkouts(20);
    set({ workouts });
  },

  clear: () => {
    set({
      metrics: [],
      bloodTests: [],
      workouts: [],
      foodByDate: {},
      caloriesByDate: {},
      loaded: false,
      loading: false,
    });
  },
}));
