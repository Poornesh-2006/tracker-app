import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'lifos.db';

const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS blood_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    test_type TEXT NOT NULL,
    value_enc TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT '',
    notes_enc TEXT,
    photo_uri TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_blood_tests_date ON blood_tests (date);
  CREATE INDEX IF NOT EXISTS idx_blood_tests_type ON blood_tests (test_type);

  CREATE TABLE IF NOT EXISTS daily_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    heart_rate INTEGER,
    steps INTEGER,
    sleep_hours REAL,
    stress INTEGER,
    weight REAL,
    recovery_score INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS food_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL DEFAULT 'snack',
    name TEXT NOT NULL,
    calories INTEGER,
    protein REAL,
    carbs REAL,
    fat REAL,
    photo_uri TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_food_date ON food_log (date);

  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    duration_min INTEGER,
    intensity INTEGER,
    calories INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts (date);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payload TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'daily_summary',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue (created_at);
  `,
  // v2 — todos, hydration, wardrobe, grooming
  `
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS hydration_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount_ml INTEGER NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_hydration_date ON hydration_log (date);

  CREATE TABLE IF NOT EXISTS wardrobe_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    photo_uri TEXT,
    color TEXT,
    brand TEXT,
    notes TEXT,
    favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_wardrobe_category ON wardrobe_items (category);

  CREATE TABLE IF NOT EXISTS grooming_routines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'skincare',
    time_of_day TEXT,
    schedule_days TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,
  // v3 — brain knowledge, education, finance
  `
  CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    parent_id INTEGER,
    learned INTEGER NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '#EB5E28',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_knowledge_parent ON knowledge_nodes (parent_id);

  CREATE TABLE IF NOT EXISTS learning_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    creator TEXT,
    url TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    level INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS education_marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    exam TEXT,
    score REAL NOT NULL,
    max_score REAL NOT NULL DEFAULT 100,
    date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS college_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    date TEXT,
    status TEXT,
    hours REAL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS finance_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    source TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_finance_date ON finance_transactions (date);

  CREATE TABLE IF NOT EXISTS finance_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    next_due TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT,
    quantity REAL NOT NULL,
    avg_cost REAL NOT NULL,
    current_price REAL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,
  // v4 — travel / metro trips
  `
  CREATE TABLE IF NOT EXISTS travel_trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    from_name TEXT NOT NULL,
    to_name TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'metro',
    total_price REAL,
    total_distance_km REAL,
    duration_min INTEGER,
    share_with_parents INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_travel_date ON travel_trips (date);

  CREATE TABLE IF NOT EXISTS travel_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    area TEXT,
    lat REAL,
    lng REAL,
    order_index INTEGER NOT NULL,
    distance_from_prev_km REAL,
    price_from_prev REAL,
    line_name TEXT,
    line_color TEXT,
    action TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (trip_id) REFERENCES travel_trips(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_travel_stops_trip ON travel_stops (trip_id);

  CREATE TABLE IF NOT EXISTS travel_live (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    trip_id INTEGER,
    lat REAL,
    lng REAL,
    heading REAL,
    updated_at TEXT,
    share_with_parents INTEGER NOT NULL DEFAULT 0
  );
  `,
  // v5 — ranks, achievements, points, and rewards
  `
  CREATE TABLE IF NOT EXISTS user_ranks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    current_rank INTEGER NOT NULL DEFAULT 1,
    total_points INTEGER NOT NULL DEFAULT 0,
    rank_name TEXT NOT NULL DEFAULT 'Bronze',
    weekly_points INTEGER NOT NULL DEFAULT 0,
    monthly_points INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date TEXT,
    rank_updated_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    description TEXT,
    points_reward INTEGER NOT NULL DEFAULT 0,
    badge_icon TEXT,
    is_completed INTEGER NOT NULL DEFAULT 0,
    progress_current INTEGER NOT NULL DEFAULT 0,
    progress_target INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS rewards_shop (
    id TEXT PRIMARY KEY,
    reward_name TEXT NOT NULL,
    description TEXT,
    reward_type TEXT NOT NULL,
    points_cost INTEGER NOT NULL,
    icon TEXT,
    unlock_rank INTEGER NOT NULL DEFAULT 1,
    is_limited_time INTEGER NOT NULL DEFAULT 0,
    expiry_date TEXT,
    stock INTEGER NOT NULL DEFAULT -1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS user_purchases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    reward_id TEXT NOT NULL,
    points_spent INTEGER NOT NULL,
    purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,
  // v6 — points ledger (earned points; rank/streaks/achievements derive from it)
  `
  CREATE TABLE IF NOT EXISTS points_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    ref_date TEXT NOT NULL,
    points INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_points_log_user_date ON points_log (user_id, ref_date);
  `,
];

let db: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  // Concurrent first callers share one open + migrate instead of racing.
  opening ??= open().finally(() => {
    opening = null;
  });
  return opening;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const instance = await SQLite.openDatabaseAsync(DATABASE_NAME);
  // Per-connection settings: must run on every open, not just in migration 1,
  // otherwise ON DELETE CASCADE silently stops working after the first launch.
  await instance.execAsync(`PRAGMA journal_mode = 'wal'; PRAGMA foreign_keys = ON;`);
  await migrate(instance);
  db = instance;
  return instance;
}

async function migrate(instance: SQLite.SQLiteDatabase): Promise<void> {
  const row = await instance.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  for (let i = row?.user_version ?? 0; i < MIGRATIONS.length; i++) {
    // Schema change and version bump commit together, or not at all.
    await instance.withTransactionAsync(async () => {
      await instance.execAsync(MIGRATIONS[i]);
      await instance.execAsync(`PRAGMA user_version = ${i + 1}`);
    });
  }
}

/** Wipe all local data. Deleting the file also resets user_version, so migrations rerun. */
export async function resetDatabase(): Promise<void> {
  if (opening) await opening.catch(() => undefined);
  if (db) {
    await db.closeAsync();
    db = null;
  }
  await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  await getDb();
}
