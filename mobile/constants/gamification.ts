export const LOCAL_USER_ID = 'local-user';

export const RANKS = [
  { level: 1, name: 'Bronze', icon: '🥉', minPoints: 0, multiplier: 1 },
  { level: 2, name: 'Silver', icon: '🥈', minPoints: 1001, multiplier: 1.1 },
  { level: 3, name: 'Gold', icon: '🥇', minPoints: 3001, multiplier: 1.2 },
  { level: 4, name: 'Platinum', icon: '💎', minPoints: 6001, multiplier: 1.3 },
  { level: 5, name: 'Diamond', icon: '👑', minPoints: 10001, multiplier: 1.5 },
  { level: 6, name: 'Legendary', icon: '🔥', minPoints: 20001, multiplier: 2 },
] as const;

export const DEFAULT_ACHIEVEMENTS = [
  ['first-workout', 'First Workout', 'Complete your first workout.', 50, '🏋️'],
  ['first-meal', 'First Meal', 'Log your first meal.', 25, '🍎'],
  ['seven-day-streak', 'Seven Day Streak', 'Stay consistent for seven days.', 150, '🔥'],
] as const;

export const DEFAULT_SHOP_ITEMS = [
  ['game-time-30', '30 Minutes Game Time', 'Redeem 30 minutes of game time.', '🎮', 250, 1],
  ['music-break', 'Music Break', 'Redeem a guilt-free music break.', '🎧', 400, 2],
  ['movie-night', 'Movie Night', 'Redeem one movie night.', '🍿', 750, 3],
  ['legend-badge', 'Legendary Badge', 'A badge for your profile.', '🏆', 1500, 5],
] as const;

export type PointReason = 'workout' | 'meal' | 'metrics';

/** Base points per logged activity (before rank multiplier) and how many per day count. */
export const POINT_RULES: Record<PointReason, { points: number; dailyCap: number }> = {
  workout: { points: 50, dailyCap: 2 },
  meal: { points: 10, dailyCap: 4 },
  metrics: { points: 20, dailyCap: 1 },
};
