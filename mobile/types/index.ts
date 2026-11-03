export interface BloodTest {
  id: number;
  date: string;
  testType: string;
  value: number;
  unit: string;
  notes: string | null;
  photoUri: string | null;
  source: 'manual' | 'photo' | 'pdf';
  createdAt?: string;
  /** True when the row couldn't be decrypted with the current key (value is NaN). */
  unreadable?: boolean;
}

export interface BloodTestInput {
  date: string;
  testType: string;
  value: number;
  unit: string;
  notes?: string | null;
  photoUri?: string | null;
  source?: 'manual' | 'photo' | 'pdf';
}

export interface DailyMetrics {
  id: number;
  date: string;
  heartRate: number | null;
  steps: number | null;
  sleepHours: number | null;
  stress: number | null;
  weight: number | null;
  recoveryScore: number | null;
  notes: string | null;
}

export interface DailyMetricsInput {
  date: string;
  heartRate?: number | null;
  steps?: number | null;
  sleepHours?: number | null;
  stress?: number | null;
  weight?: number | null;
  recoveryScore?: number | null;
  notes?: string | null;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLogEntry {
  id: number;
  date: string;
  mealType: MealType;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  photoUri: string | null;
  createdAt?: string;
}

export interface FoodLogInput {
  date: string;
  mealType: MealType;
  name: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  photoUri?: string | null;
}

export interface WorkoutEntry {
  id: number;
  date: string;
  name: string;
  durationMin: number | null;
  intensity: number | null;
  calories: number | null;
  notes: string | null;
  createdAt?: string;
}

export interface WorkoutInput {
  date: string;
  name: string;
  durationMin?: number | null;
  intensity?: number | null;
  calories?: number | null;
  notes?: string | null;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  units: 'metric' | 'imperial';
  syncEnabled: boolean;
}

export type WardrobeCategory = 'tops' | 'pants' | 'shoes' | 'outerwear' | 'accessories';

export interface WardrobeItem {
  id: number;
  category: WardrobeCategory;
  name: string;
  photoUri: string | null;
  color: string | null;
  brand: string | null;
  notes: string | null;
  favorite: boolean;
  createdAt?: string;
}

export interface WardrobeItemInput {
  category: WardrobeCategory;
  name: string;
  photoUri?: string | null;
  color?: string | null;
  brand?: string | null;
  notes?: string | null;
  favorite?: boolean;
}

export interface HydrationEntry {
  id: number;
  date: string;
  amountMl: number;
  note: string | null;
  createdAt?: string;
}

export interface TodoItem {
  id: number;
  title: string;
  done: boolean;
  dueDate: string | null;
  category: string;
  createdAt?: string;
}

export interface GroomingRoutine {
  id: number;
  title: string;
  kind: 'skincare' | 'grooming' | 'schedule';
  timeOfDay: string | null;
  scheduleDays: string | null;
  notes: string | null;
  active: boolean;
  createdAt?: string;
}

export interface KnowledgeNode {
  id: number;
  title: string;
  parentId: number | null;
  learned: boolean;
  color: string;
  notes: string | null;
}

export interface LearningMedia {
  id: number;
  kind: 'book' | 'video' | 'podcast';
  title: string;
  creator: string | null;
  url: string | null;
  status: 'todo' | 'in_progress' | 'done';
  notes: string | null;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  level: number;
  notes: string | null;
}

export interface EducationMark {
  id: number;
  subject: string;
  exam: string | null;
  score: number;
  maxScore: number;
  date: string | null;
  notes: string | null;
}

export interface CollegeActivity {
  id: number;
  kind: 'attendance' | 'hackathon' | 'event' | 'schedule';
  title: string;
  date: string | null;
  status: string | null;
  hours: number | null;
  notes: string | null;
}

export interface FinanceTransaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  source: string | null;
  note: string | null;
}

export interface FinanceSubscription {
  id: number;
  name: string;
  amount: number;
  billingCycle: 'weekly' | 'monthly' | 'yearly';
  nextDue: string | null;
  active: boolean;
}

export interface Investment {
  id: number;
  kind: 'stock' | 'crypto';
  symbol: string;
  name: string | null;
  quantity: number;
  avgCost: number;
  currentPrice: number | null;
  notes: string | null;
}

export interface TravelTrip {
  id: number;
  date: string;
  title: string;
  fromName: string;
  toName: string;
  mode: 'metro' | 'bus' | 'walk' | 'mixed';
  totalPrice: number | null;
  totalDistanceKm: number | null;
  durationMin: number | null;
  shareWithParents: boolean;
  notes: string | null;
  status: 'planned' | 'active' | 'done';
}

export interface TravelStop {
  id: number;
  tripId: number;
  name: string;
  area: string | null;
  lat: number | null;
  lng: number | null;
  orderIndex: number;
  distanceFromPrevKm: number | null;
  priceFromPrev: number | null;
  lineName: string | null;
  lineColor: string | null;
  action: string | null;
}

export interface TravelLive {
  tripId: number | null;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  updatedAt: string | null;
  shareWithParents: boolean;
}
