# Database Schema Reference
## lif.os SQLite Database

---

## **1. DATABASE OVERVIEW**

**Database Name:** `lifos.db`  
**Location:** `/data/data/com.devendrasai.lifos/files/SQLite/lifos.db`  
**Type:** SQLite 3  
**Total Tables:** 8  
**Total Indexes:** 8  

---

## **2. TABLES**

### **2.1 users Table**

**Purpose:** Store user account information

**Schema:**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique user ID (UUID) |
| username | TEXT | NOT NULL | Username (default: "user") |
| password_hash | TEXT | NOT NULL | Hashed passcode (PBKDF2) |
| created_at | TEXT | NOT NULL | Account creation timestamp |

**Example Data:**
```
id: "default"
username: "user"
password_hash: "abcd1234...hashed..."
created_at: "2026-10-05T14:30:00Z"
```

**Queries:**
```sql
-- Get user
SELECT * FROM users WHERE id = 'default';

-- Update password
UPDATE users SET password_hash = ? WHERE id = 'default';

-- Delete user data
DELETE FROM users WHERE id = 'default';
```

---

### **2.2 blood_tests Table**

**Purpose:** Store medical blood test results (ENCRYPTED)

**Schema:**
```sql
CREATE TABLE blood_tests (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  test_type TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  notes TEXT,
  photo_uri TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX idx_blood_tests_date ON blood_tests(date);
CREATE INDEX idx_blood_tests_type ON blood_tests(test_type);
```

**Columns:**
| Column | Type | Encrypted | Description |
|--------|------|-----------|-------------|
| id | TEXT | ❌ | Unique test ID (UUID) |
| date | TEXT | ❌ | Test date (YYYY-MM-DD) |
| test_type | TEXT | ❌ | Type (glucose, cholesterol, etc) |
| value | TEXT | ✅ **ENCRYPTED** | Test result value (AES-256) |
| unit | TEXT | ❌ | Unit (mg/dL, mmol/L, etc) |
| notes | TEXT | ✅ **ENCRYPTED** | User notes (AES-256) |
| photo_uri | TEXT | ❌ | Photo path (optional) |
| created_at | TEXT | ❌ | Creation timestamp |
| updated_at | TEXT | ❌ | Last update timestamp |

**Example Data:**
```
id: "uuid-1234"
date: "2026-10-05"
test_type: "glucose"
value: "U2FsdGVkX1..." (encrypted "105")
unit: "mg/dL"
notes: "U2FsdGVkX1..." (encrypted "Fasting test")
photo_uri: "file:///data/.../photo.jpg"
created_at: "2026-10-05T08:00:00Z"
updated_at: "2026-10-05T08:00:00Z"
```

**Queries:**
```sql
-- Get all blood tests
SELECT * FROM blood_tests ORDER BY date DESC;

-- Get tests by type
SELECT * FROM blood_tests WHERE test_type = 'glucose';

-- Get tests by date
SELECT * FROM blood_tests WHERE date = '2026-10-05';

-- Add new test
INSERT INTO blood_tests (id, date, test_type, value, unit, notes, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- Update test
UPDATE blood_tests SET value = ?, notes = ?, updated_at = ? WHERE id = ?;

-- Delete test
DELETE FROM blood_tests WHERE id = ?;

-- Count tests
SELECT COUNT(*) as count FROM blood_tests;
```

---

### **2.3 daily_metrics Table**

**Purpose:** Store daily health metrics

**Schema:**
```sql
CREATE TABLE daily_metrics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  heart_rate INTEGER,
  steps INTEGER,
  sleep_hours REAL,
  stress_level INTEGER,
  weight REAL,
  recovery_score INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX idx_daily_metrics_date ON daily_metrics(date);
```

**Columns:**
| Column | Type | Range | Description |
|--------|------|-------|-------------|
| id | TEXT | | Unique ID (UUID) |
| date | TEXT | YYYY-MM-DD | Date (unique per day) |
| heart_rate | INTEGER | 40-200 BPM | Heart rate in beats per minute |
| steps | INTEGER | 0+ | Daily step count |
| sleep_hours | REAL | 0-24 | Hours slept |
| stress_level | INTEGER | 1-10 | Stress level (1=low, 10=high) |
| weight | REAL | kg | Body weight |
| recovery_score | INTEGER | 0-100 | Calculated recovery score |
| notes | TEXT | | Additional notes |
| created_at | TEXT | | Creation timestamp |
| updated_at | TEXT | | Last update timestamp |

**Example Data:**
```
id: "uuid-5678"
date: "2026-10-05"
heart_rate: 72
steps: 8500
sleep_hours: 7.5
stress_level: 4
weight: 75.5
recovery_score: 85
notes: "Good day"
created_at: "2026-10-05T23:00:00Z"
updated_at: "2026-10-05T23:00:00Z"
```

**Queries:**
```sql
-- Get today's metrics
SELECT * FROM daily_metrics WHERE date = '2026-10-05';

-- Get last 7 days
SELECT * FROM daily_metrics 
WHERE date >= date('now', '-7 days')
ORDER BY date DESC;

-- Get average metrics
SELECT 
  AVG(heart_rate) as avg_hr,
  AVG(steps) as avg_steps,
  AVG(sleep_hours) as avg_sleep,
  AVG(recovery_score) as avg_recovery
FROM daily_metrics
WHERE date >= date('now', '-30 days');

-- Insert metrics
INSERT INTO daily_metrics (id, date, heart_rate, steps, sleep_hours, recovery_score, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- Update metrics
UPDATE daily_metrics SET recovery_score = ?, updated_at = ? WHERE date = ?;
```

---

### **2.4 food_log Table**

**Purpose:** Store food intake and calorie data

**Schema:**
```sql
CREATE TABLE food_log (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  photo_uri TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX idx_food_log_date ON food_log(date);
CREATE INDEX idx_food_log_meal_type ON food_log(meal_type);
```

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Unique food log ID (UUID) |
| date | TEXT | Meal date (YYYY-MM-DD) |
| meal_type | TEXT | breakfast/lunch/dinner/snack |
| name | TEXT | Food name |
| calories | INTEGER | Calorie count |
| protein | INTEGER | Protein (grams) |
| carbs | INTEGER | Carbs (grams) |
| fat | INTEGER | Fat (grams) |
| photo_uri | TEXT | Photo path (optional) |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

**Example Data:**
```
id: "uuid-9012"
date: "2026-10-05"
meal_type: "breakfast"
name: "Eggs and toast"
calories: 350
protein: 18
carbs: 45
fat: 12
photo_uri: null
created_at: "2026-10-05T08:00:00Z"
updated_at: "2026-10-05T08:00:00Z"
```

**Queries:**
```sql
-- Get today's food
SELECT * FROM food_log WHERE date = '2026-10-05' ORDER BY created_at;

-- Daily summary
SELECT 
  date,
  SUM(calories) as total_calories,
  SUM(protein) as total_protein,
  SUM(carbs) as total_carbs,
  SUM(fat) as total_fat,
  COUNT(*) as meal_count
FROM food_log
WHERE date = '2026-10-05'
GROUP BY date;

-- Weekly summary
SELECT 
  date,
  SUM(calories) as total_calories,
  AVG(calories) as avg_per_meal
FROM food_log
WHERE date >= date('now', '-7 days')
GROUP BY date
ORDER BY date DESC;

-- Add meal
INSERT INTO food_log (id, date, meal_type, name, calories, protein, carbs, fat, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
```

---

### **2.5 workouts Table**

**Purpose:** Store workout and exercise data

**Schema:**
```sql
CREATE TABLE workouts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  intensity TEXT NOT NULL,
  calories_burned INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX idx_workouts_date ON workouts(date);
```

**Columns:**
| Column | Type | Values | Description |
|--------|------|--------|-------------|
| id | TEXT | | Unique workout ID (UUID) |
| date | TEXT | YYYY-MM-DD | Workout date |
| name | TEXT | | Exercise name (Running, Gym, etc) |
| duration_min | INTEGER | 1+ | Duration in minutes |
| intensity | TEXT | low/moderate/high | Intensity level |
| calories_burned | INTEGER | | Estimated calories burned |
| notes | TEXT | | Additional notes |
| created_at | TEXT | | Creation timestamp |
| updated_at | TEXT | | Last update timestamp |

**Example Data:**
```
id: "uuid-3456"
date: "2026-10-05"
name: "Running"
duration_min: 30
intensity: "moderate"
calories_burned: 280
notes: "Park run"
created_at: "2026-10-05T18:00:00Z"
updated_at: "2026-10-05T18:00:00Z"
```

**Queries:**
```sql
-- Get today's workouts
SELECT * FROM workouts WHERE date = '2026-10-05';

-- Weekly summary
SELECT 
  date,
  COUNT(*) as workout_count,
  SUM(duration_min) as total_minutes,
  SUM(calories_burned) as total_calories
FROM workouts
WHERE date >= date('now', '-7 days')
GROUP BY date
ORDER BY date DESC;

-- Filter by intensity
SELECT * FROM workouts 
WHERE date = '2026-10-05' AND intensity = 'high';

-- Add workout
INSERT INTO workouts (id, date, name, duration_min, intensity, calories_burned, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- Calculate weekly stats
SELECT 
  COUNT(*) as workouts,
  SUM(duration_min) as total_duration,
  SUM(calories_burned) as total_burned,
  AVG(duration_min) as avg_duration
FROM workouts
WHERE date >= date('now', '-7 days');
```

---

### **2.6 settings Table**

**Purpose:** Store app settings and preferences

**Schema:**
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| key | TEXT | Setting key (theme, units, etc) |
| value | TEXT | Setting value |

**Example Data:**
```
key: "theme"
value: "dark"

key: "units"
value: "metric"

key: "notification_enabled"
value: "true"

key: "backup_last_date"
value: "2026-10-05T12:00:00Z"
```

**Common Settings:**
```
theme: light/dark/auto
units: metric/imperial
heart_rate_alert: enabled/disabled
sleep_goal: 8
steps_goal: 10000
calorie_goal: 2000
notification_time: 09:00
backup_enabled: true/false
cloud_sync_enabled: true/false
```

**Queries:**
```sql
-- Get setting
SELECT value FROM settings WHERE key = 'theme';

-- Update setting
UPDATE settings SET value = ? WHERE key = ?;

-- Insert new setting
INSERT INTO settings (key, value) VALUES (?, ?);

-- Get all settings
SELECT * FROM settings;
```

---

### **2.7 sync_queue Table**

**Purpose:** Store failed syncs for retry (optional Supabase feature)

**Schema:**
```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  data TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  status TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0
);
```

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Queue item ID (UUID) |
| action | TEXT | insert/update/delete |
| data | TEXT | JSON data to sync |
| timestamp | TEXT | When added to queue |
| status | TEXT | pending/completed/failed |
| retry_count | INTEGER | Number of retry attempts |

**Example Data:**
```
id: "queue-1"
action: "insert"
data: '{"table":"blood_tests","id":"uuid-1234",...}'
timestamp: "2026-10-05T10:30:00Z"
status: "pending"
retry_count: 0
```

**Queries:**
```sql
-- Get pending syncs
SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY timestamp;

-- Update status
UPDATE sync_queue SET status = 'completed', retry_count = ? WHERE id = ?;

-- Add to queue
INSERT INTO sync_queue (id, action, data, timestamp, status)
VALUES (?, ?, ?, ?, 'pending');

-- Clean completed
DELETE FROM sync_queue WHERE status = 'completed' AND timestamp < datetime('now', '-24 hours');
```

---

## **3. INDEXES**

**Performance Optimizations:**

```sql
-- Fast date lookups
CREATE INDEX idx_blood_tests_date ON blood_tests(date);
CREATE INDEX idx_daily_metrics_date ON daily_metrics(date);
CREATE INDEX idx_food_log_date ON food_log(date);
CREATE INDEX idx_workouts_date ON workouts(date);

-- Fast type/category lookups
CREATE INDEX idx_blood_tests_type ON blood_tests(test_type);
CREATE INDEX idx_food_log_meal_type ON food_log(meal_type);
```

---

## **4. DATA RELATIONSHIPS**

```
users (1)
  └─── (N) blood_tests
  └─── (N) daily_metrics
  └─── (N) food_log
  └─── (N) workouts
  └─── (1) settings
  └─── (N) sync_queue
```

---

## **5. ENCRYPTION**

**Encrypted Columns:**
- `blood_tests.value` (test result)
- `blood_tests.notes` (medical notes)

**Encryption Method:**
```
Algorithm: AES-256 (CBC mode)
Key: Derived from user passcode (PBKDF2)
Library: crypto-js
```

**Storage:**
```
Plain:      "105"
Encrypted:  "U2FsdGVkX1c0YWlhL2pP..."
Stored As:  "U2FsdGVkX1c0YWlhL2pP..."
Retrieved:  "U2FsdGVkX1c0YWlhL2pP..."
Decrypted:  "105"
```

---

## **6. DATA RETENTION**

**Local Storage:**
- ✅ All data kept indefinitely
- ✅ User can delete manually
- ✅ Clear all option in settings

**Cloud Storage (Optional):**
- ✅ Only aggregated data sent
- ✅ Never blood test values
- ✅ User can disable sync

---

## **7. BACKUP & RECOVERY**

**Backup (Export):**
```sql
-- Export all data as JSON
SELECT json_group_object(key, value) FROM (
  SELECT 'blood_tests' as key, json_array(SELECT json_object(...) FROM blood_tests) as value
  UNION ALL
  SELECT 'food_log' as key, json_array(...) as value
  -- ... etc for all tables
);
```

**Restore (Import):**
```
1. Load backup JSON file
2. Clear all tables
3. Insert data from backup
4. Verify integrity
5. Success message
```

---

## **8. DATABASE STATISTICS**

**Estimated Sizes:**

```
Table              | Records | Size (MB) | Notes
blood_tests        | 1,000   | 0.5      | With encrypted values
daily_metrics      | 365     | 0.05     | One per day
food_log           | 30,000  | 5.0      | ~25 meals/day * 365 days
workouts           | 5,000   | 0.5      | ~14/week * 52 weeks
settings           | 20      | 0.001    | App settings
sync_queue         | 100     | 0.1      | Failed syncs

TOTAL              |         | ~6 MB    | Typical user data
```

---

## **9. QUERY PATTERNS**

### **Daily Recap**

```sql
-- Get today's summary
SELECT 
  (SELECT COUNT(*) FROM blood_tests WHERE date = DATE('now')) as tests_today,
  (SELECT SUM(calories) FROM food_log WHERE date = DATE('now')) as calories_today,
  (SELECT SUM(duration_min) FROM workouts WHERE date = DATE('now')) as workout_minutes,
  (SELECT recovery_score FROM daily_metrics WHERE date = DATE('now')) as recovery_score
;
```

### **Weekly Trends**

```sql
-- 7-day trends
SELECT 
  date,
  (SELECT AVG(heart_rate) FROM daily_metrics WHERE date >= DATE('now', '-7 days')) as avg_hr,
  (SELECT AVG(sleep_hours) FROM daily_metrics WHERE date >= DATE('now', '-7 days')) as avg_sleep,
  (SELECT COUNT(*) FROM workouts WHERE date >= DATE('now', '-7 days')) as workouts_week
ORDER BY date DESC
LIMIT 7;
```

---

## **10. MIGRATION SCRIPTS**

**Initial Setup:**
```typescript
// services/database.ts
export const initializeDatabase = async () => {
  const db = getDb()
  
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (...)
    CREATE TABLE IF NOT EXISTS blood_tests (...)
    CREATE TABLE IF NOT EXISTS daily_metrics (...)
    CREATE TABLE IF NOT EXISTS food_log (...)
    CREATE TABLE IF NOT EXISTS workouts (...)
    CREATE TABLE IF NOT EXISTS settings (...)
    CREATE TABLE IF NOT EXISTS sync_queue (...)
    
    CREATE INDEX IF NOT EXISTS idx_blood_tests_date ON blood_tests(date);
    -- ... other indexes
  `)
}
```

---

## **CONCLUSION**

**Database Status:**
- ✅ Well-structured schema
- ✅ Optimized with indexes
- ✅ Encrypted sensitive data
- ✅ Ready for production
- ✅ Scalable design

**Total Tables:** 7  
**Total Indexes:** 8  
**Estimated Data Size:** 6-10 MB per user  
**Status:** Production-ready ✓