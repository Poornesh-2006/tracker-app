import { resetDatabase } from '@/services/database';
import { all, run } from '@/services/db';
import {
  getAchievements,
  getShopItems,
  getUserRank,
  awardPoints,
  purchaseReward,
  rankForPoints,
} from '@/services/gamification-service';
import { addWorkout } from '@/services/workout-service';
import { addFoodLog } from '@/services/meal-service';
import { todayStr } from '@/utils/dates';

const setPoints = (n: number) => run(`UPDATE user_ranks SET total_points = ?`, n);

beforeEach(async () => {
  await resetDatabase();
});

describe('gamification', () => {
  it('creates a Bronze rank once and seeds defaults', async () => {
    const [a, b] = await Promise.all([getUserRank(), getUserRank()]);
    expect(a).toMatchObject({ rankName: 'Bronze', currentRank: 1, totalPoints: 0 });
    expect(b).toEqual(a);
    expect(await all('SELECT * FROM user_ranks')).toHaveLength(1);
    expect((await getAchievements()).length).toBeGreaterThan(0);
    expect((await getShopItems()).map((i) => i.pointsCost)).toEqual([250, 400, 750, 1500]);
  });

  it('refuses locked, unknown and unaffordable rewards', async () => {
    await getUserRank();
    expect(await purchaseReward('nope')).toMatchObject({ success: false, message: 'Reward not found.' });
    expect(await purchaseReward('music-break')).toMatchObject({ success: false });
    expect((await purchaseReward('game-time-30')).message).toMatch(/enough points/);
    expect(await all('SELECT * FROM user_purchases')).toEqual([]);
  });

  it('deducts points and records the purchase', async () => {
    await getUserRank();
    await setPoints(300);
    expect(await purchaseReward('game-time-30')).toMatchObject({ success: true });
    expect((await getUserRank()).totalPoints).toBe(50);
    expect(await all('SELECT reward_id, points_spent FROM user_purchases')).toEqual([
      { reward_id: 'game-time-30', points_spent: 250 },
    ]);
  });

  it('double tap cannot overspend or log an unpaid purchase (regression)', async () => {
    await getUserRank();
    await setPoints(300); // enough for one
    const results = await Promise.all([purchaseReward('game-time-30'), purchaseReward('game-time-30')]);
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect((await getUserRank()).totalPoints).toBe(50);
    expect(await all('SELECT * FROM user_purchases')).toHaveLength(1);
  });
});

describe('points', () => {
  const today = todayStr();

  it('logging a workout awards points and unlocks First Workout (regression: points were never awarded)', async () => {
    await addWorkout({ date: today, name: 'Running', durationMin: 30 });
    const rank = await getUserRank();
    expect(rank.totalPoints).toBe(50 + 50); // workout + First Workout achievement
    expect(rank.currentStreak).toBe(1);
    expect((await getAchievements()).find((a) => a.id === 'first-workout')?.isCompleted).toBe(true);
  });

  it('applies daily caps and ignores backfilled days', async () => {
    for (let i = 0; i < 6; i++) await addFoodLog({ date: today, mealType: 'snack', name: 'x', calories: 1 });
    await addFoodLog({ date: '2020-01-01', mealType: 'snack', name: 'old', calories: 1 });
    expect((await awardPoints('meal', '2020-01-01')).points).toBe(0);
    // 4 capped meals x 10 + First Meal 25
    expect((await getUserRank()).totalPoints).toBe(4 * 10 + 25);
  });

  it('rank follows lifetime earned points, so shop spending never demotes', async () => {
    expect(rankForPoints(0).name).toBe('Bronze');
    expect(rankForPoints(1001).name).toBe('Silver');
    expect(rankForPoints(25000).name).toBe('Legendary');
    await getUserRank();
    await run(`INSERT INTO points_log (user_id, reason, ref_date, points) VALUES ('local-user', 'seed', ?, 1200)`, today);
    await run(`UPDATE user_ranks SET total_points = 1200`);
    await awardPoints('metrics', today);
    expect(await purchaseReward('game-time-30')).toMatchObject({ success: true });
    const r = await getUserRank();
    expect(r.rankName).toBe('Silver');
    expect(r.totalPoints).toBe(1200 + 22 - 250); // 20 x Silver 1.1 multiplier
  });
});
