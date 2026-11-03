/**
 * Scenario eval runner. Each evals/scenarios/*.json file is
 *   { description, scenarios: [{ name, steps: [{ op, ...args, expect? }] }] }
 * Steps run in order against the real services (fresh DB, keychain and fake
 * Supabase per scenario). Dates are written relative to today: `d: 3` or the
 * string "$d:3" both mean "3 days ago". In `expect`, strings starting with
 * "re:" are regexes; objects match as subsets.
 * Add cases by editing JSON. A new op needs one handler below.
 */
import fs from 'node:fs';
import path from 'node:path';
import { store } from '../test-support/expo-secure-store';
import { mockRemote } from '../test-support/mock-supabase';
import { resetDatabase } from '@/services/database';
import { run } from '@/services/db';
import { encryptionService } from '@/services/encryption';
import { addBloodTest, canDecryptWith, listBloodTests, reencryptAll } from '@/services/blood-test-service';
import { addFoodLog, deleteFoodLog, updateFoodLog } from '@/services/meal-service';
import { addWorkout, deleteWorkout, updateWorkout } from '@/services/workout-service';
import { upsertDailyMetrics } from '@/services/metrics-service';
import { flushQueue, queueLength, syncAll, syncLatest } from '@/services/sync-manager';
import { awardPoints, getAchievements, getUserRank, purchaseReward } from '@/services/gamification-service';
import { useAuthStore } from '@/stores/auth';
import { daysAgo } from '@/utils/dates';
import type { PointReason } from '@/constants/gamification';

jest.mock('@/services/supabase', () => require('../test-support/mock-supabase').supabaseModule);

/* eslint-disable @typescript-eslint/no-explicit-any */
type Step = { op: string; expect?: unknown; [k: string]: any };
type Ctx = { refs: Record<string, number> };
type Handler = (s: Step, ctx: Ctx) => Promise<unknown>;

const AUTH = 'lifos.auth.v3';
const PENDING = 'lifos.auth.pending';

/** "$d:N" -> date N days ago, recursively. */
function resolve(v: any): any {
  if (typeof v === 'string' && v.startsWith('$d:')) return daysAgo(Number(v.slice(3)));
  if (Array.isArray(v)) return v.map(resolve);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)]));
  return v;
}

const date = (s: Step) => daysAgo(s.d ?? 0);

/** Subset match with "re:" regex strings. */
function matches(actual: any, expected: any, at = '$'): string | null {
  if (typeof expected === 'string' && expected.startsWith('re:')) {
    return new RegExp(expected.slice(3)).test(String(actual)) ? null : `${at}: ${JSON.stringify(actual)} !~ /${expected.slice(3)}/`;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      return `${at}: expected array of ${expected.length}, got ${JSON.stringify(actual)}`;
    }
    for (let i = 0; i < expected.length; i++) {
      const m = matches(actual[i], expected[i], `${at}[${i}]`);
      if (m) return m;
    }
    return null;
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object') return `${at}: expected object, got ${JSON.stringify(actual)}`;
    for (const [k, v] of Object.entries(expected)) {
      const m = matches(actual[k], v, `${at}.${k}`);
      if (m) return m;
    }
    return null;
  }
  return Object.is(actual, expected) ? null : `${at}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
}

const meal = (s: Step) => ({
  date: date(s),
  mealType: s.mealType ?? 'lunch',
  name: s.name ?? 'Meal',
  calories: s.calories ?? null,
});
const workout = (s: Step) => ({ date: date(s), name: s.name ?? 'Running', durationMin: s.durationMin ?? 30 });

/** Captures a thrown error as { throws: message } so JSON can assert on it. */
async function outcome<T>(p: Promise<T>): Promise<T | { throws: string }> {
  try {
    return await p;
  } catch (e) {
    return { throws: e instanceof Error ? e.message : String(e) };
  }
}

const OPS: Record<string, Handler> = {
  // --- data writes
  addMeal: async (s, ctx) => {
    const id = await addFoodLog(meal(s));
    if (s.as) ctx.refs[s.as] = id;
    return id;
  },
  updateMeal: (s, ctx) => updateFoodLog(ctx.refs[s.ref], meal(s)),
  deleteMeal: (s, ctx) => deleteFoodLog(ctx.refs[s.ref]),
  addWorkout: async (s, ctx) => {
    const id = await addWorkout(workout(s));
    if (s.as) ctx.refs[s.as] = id;
    return id;
  },
  updateWorkout: (s, ctx) => updateWorkout(ctx.refs[s.ref], workout(s)),
  deleteWorkout: (s, ctx) => deleteWorkout(ctx.refs[s.ref]),
  logMetrics: (s) => upsertDailyMetrics({ date: date(s), ...(s.fields ?? {}) }),

  // --- sync
  user: async (s) => {
    mockRemote.user = s.id ? { id: s.id } : null;
  },
  failNextInsert: async () => {
    mockRemote.failNextInsert = true;
  },
  flush: () => flushQueue(),
  syncLatest: () => syncLatest(),
  syncAll: () => syncAll(),
  queue: () => queueLength(),
  remote: async (s) => {
    const rows = mockRemote.rows(s.table);
    return s.pluck ? rows.map((r) => Object.fromEntries(s.pluck.map((k: string) => [k, r[k]]))) : rows;
  },

  // --- gamification
  award: (s) => awardPoints(s.reason as PointReason, date(s)),
  seedPoints: async (s) => {
    await getUserRank();
    await run(
      `INSERT INTO points_log (user_id, reason, ref_date, points) VALUES ('local-user', 'seed', ?, ?)`,
      date(s),
      s.points,
    );
    await run(`UPDATE user_ranks SET total_points = total_points + ?`, s.points);
  },
  rank: () => getUserRank(),
  achievements: async () => (await getAchievements()).filter((a) => a.isCompleted).map((a) => a.id),
  purchase: (s) => purchaseReward(s.id),

  // --- passcode / encryption
  setup: (s) => encryptionService.setup(s.pw),
  lock: async () => encryptionService.lock(),
  unlock: (s) => outcome(encryptionService.unlock(s.pw, reencryptAll, canDecryptWith)),
  changePassword: (s) => outcome(encryptionService.changePassword(s.from, s.to, reencryptAll, canDecryptWith)),
  /** App killed after re-encryption committed but before the new verifier was promoted. */
  crashAfterReencrypt: async (s) => {
    const oldAuth = store.get(AUTH)!;
    await encryptionService.changePassword(s.from, s.to, reencryptAll, canDecryptWith);
    store.set(PENDING, store.get(AUTH)!);
    store.set(AUTH, oldAuth);
    encryptionService.lock();
  },
  /** App killed mid re-encryption (transaction rolled back), PENDING left behind. */
  crashDuringReencrypt: async (s) => {
    let pending: string | undefined;
    const killed = async () => {
      pending = store.get(PENDING);
      throw new Error('killed');
    };
    await encryptionService.changePassword(s.from, s.to, killed, canDecryptWith).catch(() => undefined);
    store.set(PENDING, pending!);
    encryptionService.lock();
  },
  addBlood: (s) => addBloodTest({ date: date(s), testType: s.testType ?? 'LDL', unit: 'mg/dL', value: s.value }),
  bloodValues: async () => (await listBloodTests()).map((b) => b.value),
  keychain: async () => ({ pending: store.has(PENDING) }),

  // --- auth store (lockout)
  storeSetup: (s) => useAuthStore.getState().setup(s.pw),
  storeLock: () => useAuthStore.getState().lock(),
  storeUnlock: async (s) => {
    const result = await useAuthStore.getState().unlock(s.pw);
    return { result, error: useAuthStore.getState().error };
  },
  expireLockout: async () => {
    const raw = store.get('lifos.auth.attempts');
    if (raw) store.set('lifos.auth.attempts', JSON.stringify({ ...JSON.parse(raw), until: Date.now() - 1 }));
  },
};

const dir = path.join(__dirname, '..', 'evals', 'scenarios');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

beforeEach(async () => {
  await resetDatabase();
  store.clear();
  encryptionService.lock();
  mockRemote.reset();
  useAuthStore.setState({ status: 'uninitialized', error: null });
});

describe.each(files)('scenarios %s', (file) => {
  const set = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as {
    scenarios: { name: string; steps: Step[] }[];
  };

  it.each(set.scenarios.map((sc) => [sc.name, sc] as const))('%s', async (_name, sc) => {
    const ctx: Ctx = { refs: {} };
    for (const [i, step] of sc.steps.entries()) {
      const handler = OPS[step.op];
      if (!handler) throw new Error(`step ${i}: unknown op "${step.op}"`);
      const actual = await handler(step, ctx);
      if ('expect' in step) {
        const miss = matches(actual, resolve(step.expect));
        if (miss) throw new Error(`step ${i} (${step.op}) ${miss}`);
      }
    }
  });
});
