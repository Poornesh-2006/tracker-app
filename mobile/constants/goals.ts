/** Daily targets used across Today, Fuel and Gym. One place to tune them. */
export const GOALS = {
  steps: 10_000,
  waterMl: 2_500,
  glassMl: 250,
  sleepHours: 8,
  calories: 2_200,
  workoutMinPerWeek: 150,
} as const;

/** "Good morning / afternoon / evening" for headers. */
export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
