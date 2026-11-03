/**
 * Golden eval runner. Each evals/*.json file is { fn, description, cases: [{ name, input, expected }] }.
 * Add cases by editing JSON. A new `fn` needs one adapter below.
 * Run alone: npm run evals
 */
import fs from 'node:fs';
import path from 'node:path';
import { calculateRecoveryScore, checkMetricsAlerts, generateInsights, predictStress } from '@/services/ai-engine';
import { calculateWorkoutCalories } from '@/constants/workout-calculations';
import { computeAlerts } from '@/constants/metrics';
import { validateNumber, type ValidationKey } from '@/utils/validators';
import { summarizeFinance } from '@/services/finance-service';
import { addDays, daysAgo, isValidDateStr, lastNDays, parseDateStr, shortDate, toDateStr, todayStr } from '@/utils/dates';
import { parseNum } from '@/utils/helpers';
import { parseValues } from '@/components/forms/schema';
import { layoutGraph } from '@/components/brain/graphLayout';
import { rankForPoints, streakEnding } from '@/services/gamification-service';
import { lockoutDelayMs } from '@/stores/auth';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Adapter = (input: any) => unknown;

const withDates = (rows: any[]) => rows.map(({ daysAgo: n, ...rest }) => ({ ...rest, date: daysAgo(n) }));
const alertShape = (alerts: { level: string; title: string }[]) => alerts.map(({ level, title }) => ({ level, title }));

const ADAPTERS: Record<string, Adapter> = {
  calculateRecoveryScore: (i) => calculateRecoveryScore(i),
  calculateWorkoutCalories: (i) => calculateWorkoutCalories(i.type, i.durationMin, i.intensity, i.weightKg ?? undefined),
  computeAlerts: (i) => alertShape(computeAlerts(i)),
  checkMetricsAlerts: (i) => alertShape(checkMetricsAlerts(i)),
  generateInsights: (i) =>
    generateInsights({ metrics: withDates(i.metrics), workouts: withDates(i.workouts) }).map((x) => x.title),
  predictStress: (i) => predictStress(i),
  // JSON has no NaN/Infinity: the strings stand in for them.
  validateNumber: (i) =>
    validateNumber(i.key as ValidationKey, typeof i.value === 'string' ? Number(i.value) : i.value),
  summarizeFinance: (i) => summarizeFinance(i),
  // JSON has no NaN: report it as the string "NaN".
  parseNum: (i) => {
    const n = parseNum(i);
    return Number.isNaN(n) ? 'NaN' : n;
  },
  parseValues: (i) => {
    try {
      return parseValues(i.fields, i.raw);
    } catch (e) {
      return { error: (e as Error).message };
    }
  },
  layoutGraph: (nodes) => {
    const size = 300;
    const placed = layoutGraph(nodes.map((n: any) => ({ title: String(n.id), learned: false, color: '#000', notes: null, ...n })), size);
    return {
      placed: placed.length,
      inside: placed.every((p) => p.x >= 0 && p.x <= size && p.y >= 0 && p.y <= size),
      depths: placed.map((p) => p.depth),
    };
  },
  gamificationRules: (i) => {
    if ('rank' in i) return rankForPoints(i.rank).name;
    if ('streak' in i) return streakEnding(new Set(i.streak.map((n: number) => daysAgo(n))), new Date());
    return lockoutDelayMs(i.lockout);
  },
  dates: (i) => {
    if (i.toDateStr) return toDateStr(new Date(i.toDateStr[0], i.toDateStr[1], i.toDateStr[2]));
    if (i.roundTrip) return toDateStr(parseDateStr(i.roundTrip));
    if (i.shortDate) return shortDate(i.shortDate);
    if ('valid' in i) return isValidDateStr(i.valid);
    if (i.addDays) return addDays(i.addDays[0], i.addDays[1]);
    if (i.lastNDays) return lastNDays(i.lastNDays[0], i.lastNDays[1]);
    if ('daysAgoIsToday' in i) return daysAgo(i.daysAgoIsToday) === todayStr();
    return daysAgo(i.daysAgoBeforeToday) < todayStr();
  },
};

const dir = path.join(__dirname, '..', 'evals');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

describe.each(files)('eval %s', (file) => {
  const set = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as {
    fn: string;
    cases: { name: string; input: unknown; expected: unknown }[];
  };
  const run = ADAPTERS[set.fn];

  it('has an adapter and cases', () => {
    expect(run).toBeDefined();
    expect(set.cases.length).toBeGreaterThan(0);
  });

  it.each(set.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(run(c.input)).toEqual(c.expected);
  });
});
