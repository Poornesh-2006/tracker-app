import { resetDatabase } from '@/services/database';
import { all, run } from '@/services/db';
import { getDailyMetrics, listRecentMetrics, upsertDailyMetrics } from '@/services/metrics-service';
import { addFoodLog, caloriesForDate, deleteFoodLog, listFoodByDate, updateFoodLog } from '@/services/meal-service';
import { addWorkout, listWorkouts, updateWorkout } from '@/services/workout-service';
import { addHydration, deleteHydration, totalHydrationMl } from '@/services/hydration-service';
import { addTodo, listTodos, setTodoDone } from '@/services/todo-service';
import { addWardrobeItem, listWardrobe, updateWardrobeItem } from '@/services/wardrobe-service';
import { addRoutine, listRoutines } from '@/services/grooming-service';
import { addKnowledgeNode, deleteKnowledgeNode, listKnowledgeNodes, setNodeLearned } from '@/services/knowledge-service';
import { addMedia, listMedia, setMediaStatus } from '@/services/media-service';
import { addCollegeActivity, addMark, addSkill, listCollegeActivities, listMarks, listSkills } from '@/services/education-service';
import { addInvestment, addSubscription, addTransaction, listInvestments, listSubscriptions, listTransactions } from '@/services/finance-service';
import { createTrip, deleteTrip, getLiveLocation, getTrip, listStops, listTripDates, upsertLiveLocation } from '@/services/travel-service';
import { getSettings, setSetting } from '@/services/settings-service';

beforeEach(() => resetDatabase());

describe('metrics', () => {
  it('upsert keeps one row per date and preserves fields left null', async () => {
    const id = await upsertDailyMetrics({ date: '2026-01-01', heartRate: 60, sleepHours: 7 });
    expect(await upsertDailyMetrics({ date: '2026-01-01', steps: 9000 })).toBe(id);
    expect(await getDailyMetrics('2026-01-01')).toMatchObject({ heartRate: 60, sleepHours: 7, steps: 9000 });
    expect(await all('SELECT * FROM daily_metrics')).toHaveLength(1);
  });

  it('listRecentMetrics returns the latest N, oldest first', async () => {
    for (const d of ['2026-01-01', '2026-01-03', '2026-01-02']) await upsertDailyMetrics({ date: d, steps: 1 });
    expect((await listRecentMetrics(2)).map((m) => m.date)).toEqual(['2026-01-02', '2026-01-03']);
  });
});

describe('food', () => {
  it('round-trips, updates, totals and deletes', async () => {
    const id = await addFoodLog({ date: '2026-01-01', mealType: 'lunch', name: 'Rice', calories: 300 });
    await addFoodLog({ date: '2026-01-01', mealType: 'dinner', name: 'Dal', calories: 200, protein: 12 });
    expect(await caloriesForDate('2026-01-01')).toBe(500);
    await updateFoodLog(id, { date: '2026-01-01', mealType: 'lunch', name: 'Rice', calories: 350 });
    expect(await caloriesForDate('2026-01-01')).toBe(550);
    const [first] = await listFoodByDate('2026-01-01');
    expect(first).toMatchObject({ mealType: 'lunch', name: 'Rice', calories: 350, protein: null, photoUri: null });
    await deleteFoodLog(id);
    expect(await listFoodByDate('2026-01-01')).toHaveLength(1);
    expect(await caloriesForDate('2099-01-01')).toBe(0);
  });
});

describe('workouts', () => {
  it('estimates calories when not given, respects explicit calories', async () => {
    const id = await addWorkout({ date: '2026-01-01', name: 'Running', durationMin: 30, intensity: 3 });
    expect((await listWorkouts())[0].calories).toBe(540);
    await updateWorkout(id, { date: '2026-01-01', name: 'Running', durationMin: 30, intensity: 3, calories: 100 });
    expect((await listWorkouts())[0]).toMatchObject({ calories: 100, durationMin: 30 });
    await addWorkout({ date: '2026-01-02', name: 'Yoga' });
    expect((await listWorkouts())[0]).toMatchObject({ name: 'Yoga', calories: null });
  });
});

describe('hydration, todos, wardrobe, grooming', () => {
  it('hydration totals per day', async () => {
    const id = await addHydration('2026-01-01', 250);
    await addHydration('2026-01-01', 500, 'big glass');
    expect(await totalHydrationMl('2026-01-01')).toBe(750);
    await deleteHydration(id);
    expect(await totalHydrationMl('2026-01-01')).toBe(500);
  });

  it('todos map done to boolean and sort open first', async () => {
    const a = await addTodo('  first  ');
    await addTodo('second', 'travel', '2026-02-01');
    await setTodoDone(a, true);
    const todos = await listTodos();
    expect(todos.map((t) => [t.title, t.done])).toEqual([['second', false], ['first', true]]);
    expect(todos[0]).toMatchObject({ category: 'travel', dueDate: '2026-02-01' });
  });

  it('wardrobe favorites first, filter by category, update', async () => {
    const shirt = await addWardrobeItem({ category: 'tops', name: 'Shirt' });
    await addWardrobeItem({ category: 'shoes', name: 'Boots', favorite: true });
    expect((await listWardrobe()).map((w) => [w.name, w.favorite])).toEqual([['Boots', true], ['Shirt', false]]);
    await updateWardrobeItem(shirt, { category: 'tops', name: 'Shirt', favorite: true, color: 'blue' });
    expect(await listWardrobe('tops')).toMatchObject([{ name: 'Shirt', favorite: true, color: 'blue' }]);
  });

  it('grooming routines default kind and active=true', async () => {
    await addRoutine({ title: 'Moisturise' });
    expect(await listRoutines()).toMatchObject([{ title: 'Moisturise', kind: 'skincare', active: true }]);
  });
});

describe('brain', () => {
  it('deleting a knowledge node removes descendants at every depth (regression)', async () => {
    const root = await addKnowledgeNode({ title: 'Math' });
    const child = await addKnowledgeNode({ title: 'Algebra', parentId: root });
    await addKnowledgeNode({ title: 'Groups', parentId: child });
    const other = await addKnowledgeNode({ title: 'Art' });
    await setNodeLearned(other, true);
    await deleteKnowledgeNode(root);
    expect(await listKnowledgeNodes()).toEqual([
      { id: other, title: 'Art', parentId: null, learned: true, color: '#EB5E28', notes: null },
    ]);
  });

  it('media, skills, marks, college activities', async () => {
    const m = await addMedia({ kind: 'book', title: ' Dune ' });
    await setMediaStatus(m, 'done');
    expect(await listMedia('book')).toMatchObject([{ title: 'Dune', status: 'done' }]);
    expect(await listMedia('video')).toEqual([]);
    await addSkill({ name: 'TS', level: 4 });
    expect(await listSkills()).toMatchObject([{ name: 'TS', level: 4, category: 'general' }]);
    await addMark({ subject: 'Physics', score: 42, maxScore: 50 });
    expect(await listMarks()).toMatchObject([{ subject: 'Physics', score: 42, maxScore: 50 }]);
    await addCollegeActivity({ kind: 'hackathon', title: 'Robotics', hours: 3 });
    expect(await listCollegeActivities('hackathon')).toMatchObject([{ title: 'Robotics', hours: 3 }]);
  });
});

describe('finance', () => {
  it('stores transactions, subscriptions, investments', async () => {
    await addTransaction({ type: 'expense', category: 'food', amount: 12.5, date: '2026-01-01' });
    expect(await listTransactions()).toMatchObject([{ type: 'expense', amount: 12.5, source: null }]);
    await addSubscription({ name: ' Netflix ', amount: 9 });
    expect(await listSubscriptions()).toMatchObject([{ name: 'Netflix', billingCycle: 'monthly', active: true }]);
    await addInvestment({ kind: 'stock', symbol: ' aapl ', quantity: 2, avgCost: 100 });
    expect(await listInvestments()).toMatchObject([{ symbol: 'AAPL', avgCost: 100, currentPrice: null }]);
  });
});

describe('travel', () => {
  const trip = {
    date: '2026-03-01',
    title: 'Office',
    fromName: ' Home ',
    toName: 'Work',
    stops: [{ name: 'A', priceFromPrev: 0 }, { name: 'B', priceFromPrev: 20, lineColor: '#00F' }],
  };

  it('creates trip with ordered stops and a todo', async () => {
    const id = await createTrip(trip);
    expect(await getTrip(id)).toMatchObject({ fromName: 'Home', mode: 'metro', status: 'planned', shareWithParents: false });
    expect((await listStops(id)).map((s) => [s.name, s.orderIndex, s.lineColor])).toEqual([
      ['A', 0, '#EB5E28'],
      ['B', 1, '#00F'],
    ]);
    expect(await listTodos()).toMatchObject([{ title: 'Travel: Home → Work', category: 'travel', dueDate: '2026-03-01' }]);
    expect(await listTripDates()).toEqual(['2026-03-01']);
  });

  it('is atomic: a bad stop leaves no trip, stops or todo behind (regression)', async () => {
    const bad = { ...trip, stops: [{ name: 'A' }, { name: undefined as unknown as string }] };
    await expect(createTrip(bad)).rejects.toThrow();
    expect(await all('SELECT * FROM travel_trips')).toEqual([]);
    expect(await all('SELECT * FROM travel_stops')).toEqual([]);
    expect(await listTodos()).toEqual([]);
  });

  it('deleteTrip removes its stops', async () => {
    const id = await createTrip({ ...trip, addToTodo: false });
    await deleteTrip(id);
    expect(await all('SELECT * FROM travel_stops')).toEqual([]);
  });

  it('live location is a single row; omitted share flag is kept', async () => {
    expect(await getLiveLocation()).toBeNull();
    await upsertLiveLocation({ tripId: null, lat: 1, lng: 2, shareWithParents: true });
    await upsertLiveLocation({ tripId: 5, lat: 3, lng: 4 });
    expect(await all('SELECT * FROM travel_live')).toHaveLength(1);
    expect(await getLiveLocation()).toMatchObject({ tripId: 5, lat: 3, lng: 4, shareWithParents: true });
  });
});

describe('settings', () => {
  it('defaults, persists, and rejects corrupt values', async () => {
    expect(await getSettings()).toEqual({ theme: 'system', units: 'metric', syncEnabled: false });
    await setSetting('theme', 'dark');
    await setSetting('syncEnabled', 'true');
    await setSetting('theme', 'dark'); // upsert, not duplicate
    expect(await getSettings()).toEqual({ theme: 'dark', units: 'metric', syncEnabled: true });
    await run(`UPDATE settings SET value = 'neon' WHERE key = 'theme'`);
    expect((await getSettings()).theme).toBe('system');
  });
});
