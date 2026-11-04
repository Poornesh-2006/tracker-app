import { all, allAs, first, insert, run, transaction } from './db';
import { getDb } from './database';
import {
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_SHOP_ITEMS,
  LOCAL_USER_ID,
  POINT_RULES,
  RANKS,
  type PointReason,
} from '@/constants/gamification';
import { daysAgo, toDateStr, todayStr } from '@/utils/dates';

export interface UserRank {
  userId: string;
  currentRank: number;
  totalPoints: number;
  rankName: string;
  weeklyPoints: number;
  monthlyPoints: number;
  bestStreak: number;
  currentStreak: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  pointsReward: number;
  badgeIcon: string;
  isCompleted: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointsCost: number;
  unlockRank: number;
  canBuy: boolean;
  purchasable: boolean;
}

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * DB instance last seeded. Tracking the instance (not a boolean) means a wiped
 * and reopened database (reset, tests) is re-seeded automatically.
 */
let seededFor: object | null = null;

/** Idempotent (INSERT OR IGNORE); runs once per DB connection so new defaults reach existing users. */
async function seedDefaults(userId: string): Promise<void> {
  const db = await getDb();
  if (seededFor === db) return;
  for (const [id, name, description, points, icon] of DEFAULT_ACHIEVEMENTS) {
    await run(
      `INSERT OR IGNORE INTO achievements (id, user_id, achievement_name, description, points_reward, badge_icon)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      userId,
      name,
      description,
      points,
      icon,
    );
  }
  for (const [id, name, description, icon, cost, unlockRank] of DEFAULT_SHOP_ITEMS) {
    await run(
      `INSERT OR IGNORE INTO rewards_shop (id, reward_name, description, reward_type, points_cost, icon, unlock_rank)
       VALUES (?, ?, ?, 'cosmetic', ?, ?, ?)`,
      id,
      name,
      description,
      cost,
      icon,
      unlockRank,
    );
  }
  seededFor = db;
}

export async function getUserRank(userId = LOCAL_USER_ID): Promise<UserRank> {
  const read = async () =>
    (
      await allAs<UserRank>(
        `SELECT user_id, current_rank, total_points, rank_name, weekly_points, monthly_points, best_streak, current_streak
         FROM user_ranks WHERE user_id = ?`,
        [userId],
      )
    )[0];
  let rank = await read();
  if (!rank) {
    await insert(
      `INSERT OR IGNORE INTO user_ranks (id, user_id, current_rank, total_points, rank_name) VALUES (?, ?, ?, 0, ?)`,
      newId('rank'),
      userId,
      RANKS[0].level,
      RANKS[0].name,
    );
    rank = await read();
  }
  await seedDefaults(userId);
  // Derived stats are computed on read so they never go stale between awards
  // (a week off must show a broken streak and 0 weekly points).
  const [weekly, monthly, lifetime, dayRows] = await Promise.all([
    pointsSince(userId, daysAgo(6)),
    pointsSince(userId, daysAgo(29)),
    pointsSince(userId),
    all<{ ref_date: string }>(`SELECT DISTINCT ref_date FROM points_log WHERE user_id = ?`, userId),
  ]);
  const streak = streakEnding(new Set(dayRows.map((r) => r.ref_date)), new Date());
  const level = rankForPoints(lifetime);
  return {
    ...rank,
    currentRank: level.level,
    rankName: level.name,
    weeklyPoints: weekly,
    monthlyPoints: monthly,
    currentStreak: streak,
    bestStreak: Math.max(rank.bestStreak, streak),
  };
}

export async function getAchievements(userId = LOCAL_USER_ID): Promise<Achievement[]> {
  await getUserRank(userId);
  const rows = await all<{
    id: string;
    achievement_name: string;
    description: string | null;
    points_reward: number;
    badge_icon: string | null;
    is_completed: number;
  }>(
    `SELECT id, achievement_name, description, points_reward, badge_icon, is_completed
     FROM achievements WHERE user_id = ? ORDER BY is_completed DESC, id ASC`,
    userId,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.achievement_name,
    description: r.description ?? '',
    pointsReward: r.points_reward,
    badgeIcon: r.badge_icon ?? '🏅',
    isCompleted: !!r.is_completed,
  }));
}

export async function getShopItems(userId = LOCAL_USER_ID): Promise<ShopItem[]> {
  const rank = await getUserRank(userId);
  const rows = await all<{
    id: string;
    reward_name: string;
    description: string | null;
    icon: string | null;
    points_cost: number;
    unlock_rank: number;
  }>(`SELECT id, reward_name, description, icon, points_cost, unlock_rank FROM rewards_shop ORDER BY points_cost ASC`);
  return rows.map((r) => {
    const canBuy = rank.currentRank >= r.unlock_rank;
    return {
      id: r.id,
      name: r.reward_name,
      description: r.description ?? '',
      icon: r.icon ?? '🎁',
      pointsCost: r.points_cost,
      unlockRank: r.unlock_rank,
      canBuy,
      purchasable: canBuy && rank.totalPoints >= r.points_cost,
    };
  });
}

/**
 * The point deduction is conditional (`total_points >= cost`) and shares a
 * transaction with the purchase record, so a double tap can't overspend or
 * log a purchase that wasn't paid for.
 */
export async function purchaseReward(
  rewardId: string,
  userId = LOCAL_USER_ID,
): Promise<{ success: boolean; message: string }> {
  const item = (await getShopItems(userId)).find((c) => c.id === rewardId);
  if (!item) return { success: false, message: 'Reward not found.' };
  if (!item.canBuy) return { success: false, message: `Reach rank ${item.unlockRank} to unlock this reward.` };

  let paid = false;
  await transaction(async () => {
    const changed = await run(
      `UPDATE user_ranks SET total_points = total_points - ?, updated_at = datetime('now')
       WHERE user_id = ? AND total_points >= ?`,
      item.pointsCost,
      userId,
      item.pointsCost,
    );
    if (changed === 0) return;
    await run(
      `INSERT INTO user_purchases (id, user_id, reward_id, points_spent) VALUES (?, ?, ?, ?)`,
      newId('purchase'),
      userId,
      rewardId,
      item.pointsCost,
    );
    paid = true;
  });
  return paid
    ? { success: true, message: `${item.name} purchased successfully.` }
    : { success: false, message: 'You do not have enough points.' };
}

/** Rank for lifetime *earned* points (spending never demotes). */
export function rankForPoints(lifetime: number): (typeof RANKS)[number] {
  return [...RANKS].reverse().find((r) => lifetime >= r.minPoints) ?? RANKS[0];
}

/** Consecutive active days ending today, or yesterday (the streak survives until tonight). */
export function streakEnding(days: Set<string>, today: Date): number {
  const d = new Date(today);
  if (!days.has(toDateStr(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(toDateStr(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

async function pointsSince(userId: string, from = '0000-00-00'): Promise<number> {
  const row = await first<{ s: number | null }>(
    `SELECT SUM(points) AS s FROM points_log WHERE user_id = ? AND ref_date >= ?`,
    userId,
    from,
  );
  return row?.s ?? 0;
}

const FIRST_ACHIEVEMENT: Partial<Record<PointReason, string>> = { workout: 'first-workout', meal: 'first-meal' };
const STREAK_ACHIEVEMENT = 'seven-day-streak';

export interface AwardResult {
  points: number;
  unlocked: string[];
}

/**
 * Awards points for a logged activity. Only today's entries earn points
 * (backfilling can't farm), each reason has a daily cap, and the current
 * rank's multiplier applies. Streaks, achievements and rank update in the
 * same transaction.
 */
export async function awardPoints(reason: PointReason, date: string, userId = LOCAL_USER_ID): Promise<AwardResult> {
  const result: AwardResult = { points: 0, unlocked: [] };
  const today = todayStr();
  if (date !== today) return result;
  await getUserRank(userId); // ensures rank row + seeded achievements

  await transaction(async () => {
    const rule = POINT_RULES[reason];
    const used = await first<{ n: number }>(
      `SELECT COUNT(*) AS n FROM points_log WHERE user_id = ? AND reason = ? AND ref_date = ?`,
      userId,
      reason,
      today,
    );
    if ((used?.n ?? 0) >= rule.dailyCap) return;

    const log = (why: string, pts: number) =>
      run(`INSERT INTO points_log (user_id, reason, ref_date, points) VALUES (?, ?, ?, ?)`, userId, why, today, pts);

    const points = Math.round(rule.points * rankForPoints(await pointsSince(userId)).multiplier);
    await log(reason, points);
    result.points += points;

    const days = new Set(
      (await all<{ ref_date: string }>(`SELECT DISTINCT ref_date FROM points_log WHERE user_id = ?`, userId)).map(
        (r) => r.ref_date,
      ),
    );
    const streak = streakEnding(days, new Date());

    const candidates = [FIRST_ACHIEVEMENT[reason], streak >= 7 ? STREAK_ACHIEVEMENT : undefined];
    for (const id of candidates) {
      if (!id) continue;
      const ach = await first<{ points_reward: number; achievement_name: string }>(
        `SELECT points_reward, achievement_name FROM achievements WHERE id = ? AND user_id = ? AND is_completed = 0`,
        id,
        userId,
      );
      if (!ach) continue;
      await run(
        `UPDATE achievements SET is_completed = 1, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
        id,
        userId,
      );
      await log(`achievement:${id}`, ach.points_reward);
      result.points += ach.points_reward;
      result.unlocked.push(ach.achievement_name);
    }

    const rank = rankForPoints(await pointsSince(userId));
    await run(
      `UPDATE user_ranks SET
         total_points = total_points + ?,
         current_rank = ?,
         rank_name = ?,
         weekly_points = ?,
         monthly_points = ?,
         current_streak = ?,
         best_streak = MAX(best_streak, ?),
         last_activity_date = ?,
         rank_updated_at = datetime('now'),
         updated_at = datetime('now')
       WHERE user_id = ?`,
      result.points,
      rank.level,
      rank.name,
      await pointsSince(userId, daysAgo(6)),
      await pointsSince(userId, daysAgo(29)),
      streak,
      streak,
      today,
      userId,
    );
  });
  return result;
}

/** For write services: a points failure must never fail the user's save. */
export async function awardPointsSafely(reason: PointReason, date: string): Promise<void> {
  try {
    await awardPoints(reason, date);
  } catch (e) {
    console.error(`Awarding points for ${reason} failed:`, e);
  }
}

/** Lifetime *earned* points (rank basis); spending in the shop doesn't reduce it. */
export const getLifetimePoints = (userId = LOCAL_USER_ID) => pointsSince(userId);

/** Days (YYYY-MM-DD) in [from, to] on which the user logged anything that earned points. */
export async function activeDaysBetween(from: string, to: string, userId = LOCAL_USER_ID): Promise<string[]> {
  const rows = await all<{ ref_date: string }>(
    `SELECT DISTINCT ref_date FROM points_log WHERE user_id = ? AND ref_date >= ? AND ref_date <= ? ORDER BY ref_date`,
    userId,
    from,
    to,
  );
  return rows.map((r) => r.ref_date);
}
