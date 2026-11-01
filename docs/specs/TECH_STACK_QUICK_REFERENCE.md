# TECH STACK SUMMARY & QUICK REFERENCE
## What to Use, Where, and Why

---

## **QUICK ANSWER: TECH STACK AT A GLANCE**

| Component | Technology | Language | Why? |
|-----------|-----------|----------|-----|
| **Phone App** | React Native + Expo | TypeScript/JS | Single codebase, iOS + Android, live preview |
| **Laptop/Desktop App** | React + Electron | TypeScript | Desktop native feel, web-based, cross-platform |
| **Web Dashboard** | React + Vite | TypeScript | Fast, modern, responsive |
| **Local Database** | SQLite | SQL | Encrypted, offline, lightweight |
| **Cloud Database** | Supabase (PostgreSQL) | SQL | Easy setup, free tier, aggregated data only |
| **Local AI** | Ollama + Gemma | Python API | Free, private, runs on your computer |
| **State Management** | Zustand | TypeScript | Simple, fast, lightweight |
| **UI Components** | React Native Paper (mobile) + shadcn/ui (web) | TypeScript/CSS | Pre-built, beautiful, accessible |
| **Charts** | react-native-gifted-charts (mobile) + Recharts (web) | TypeScript | Easy to use, responsive |
| **Encryption** | crypto-js | JavaScript | AES-256 encryption |

---

## **INSTALLATION & SETUP QUICK START**

### **Step 1: Install Required Software**

```
1. Node.js 18+ (from nodejs.org)
   - Check: node --version

2. VS Code (from code.visualstudio.com)
   - Or Cursor (from cursor.sh)

3. Ollama (from ollama.ai)
   - After install: ollama pull gemma:7b

4. Git (from git-scm.com)
   - Check: git --version
```

### **Step 2: Create Mobile Project**

```bash
# Create React Native + Expo project
npx create-expo-app health-tracker-mobile
cd health-tracker-mobile

# Install all dependencies
npm install react-native-paper expo-sqlite \
  @react-native-async-storage/async-storage \
  axios zustand crypto-js expo-crypto expo-secure-store \
  react-native-gifted-charts react-native-svg expo-linear-gradient \
  expo-image-picker expo-file-system expo-sharing

# Start development
npm start
# Scan QR code with Expo Go app on your phone
```

### **Step 3: Create Web Project**

```bash
# Create React + Vite project
npm create vite@latest health-tracker-web -- --template react-ts
cd health-tracker-web

# Install all dependencies
npm install
npm install react-router-dom zustand axios sql.js \
  crypto-js @supabase/supabase-js recharts \
  tailwindcss postcss autoprefixer electron jspdf html2canvas

# Setup Tailwind
npx tailwindcss init -p

# Start development
npm run dev
```

### **Step 4: Setup Supabase (Optional, for cloud sync)**

```bash
# Create account at supabase.com
# Create new project
# Get your API URL and key
# Add to .env file

SUPABASE_URL=your_url_here
SUPABASE_ANON_KEY=your_key_here
```

### **Step 5: Start Ollama for Local AI**

```bash
# Open terminal and run:
ollama serve

# Keep this running in background
# Your AI will use http://localhost:11434
```

---

## **PLATFORM-SPECIFIC DETAILS**

### **PHONE (Android/iOS)**

**Technology:** React Native + Expo
**Language:** TypeScript (recommended) or JavaScript
**How to develop:**
```
1. Install Expo Go app on your phone
2. npm start in mobile project folder
3. Scan QR code with phone
4. Changes appear instantly (live reload)
5. No building/compiling needed for development
6. Can test on physical phone directly
```

**What you can do:**
- ✅ Tap on app to log data
- ✅ Use phone camera (photo of meal, blood test PDF)
- ✅ Use phone sensors (accelerometer for workouts)
- ✅ Offline-first (all works without internet)
- ✅ Local AI (Gemma runs on your device)
- ✅ Encrypted storage (on your phone)
- ✅ Sync to cloud (optional, automatic)

**Files to edit:**
- `app/(tabs)/dashboard.tsx` - Main dashboard
- `app/(tabs)/food.tsx` - Food logging
- `app/(tabs)/medical.tsx` - Medical tests
- `app/(tabs)/workouts.tsx` - Workout tracking
- `components/` - Reusable UI components
- `services/` - Core logic (database, AI, sync)

---

### **LAPTOP/DESKTOP**

**Technology:** React + Vite (+ Electron for desktop app)
**Language:** TypeScript
**How to develop:**
```
1. npm run dev in web project folder
2. Opens at http://localhost:5173
3. Edit files → changes appear instantly
4. Full browser developer tools available
5. Can run on Windows, Mac, Linux
```

**What you can do:**
- ✅ Better visualization (bigger screen)
- ✅ Detailed charts and analytics
- ✅ Generate PDF reports
- ✅ Export data (CSV, JSON)
- ✅ Backup/restore data
- ✅ Settings management
- ✅ Sync status dashboard
- ✅ Medical alerts view

**Files to edit:**
- `src/pages/Dashboard.tsx` - Main dashboard
- `src/pages/Analytics.tsx` - Charts & trends
- `src/pages/Reports.tsx` - Generate reports
- `src/components/` - UI components
- `src/services/` - Core logic

---

## **DATABASE: WHERE YOUR DATA GOES**

### **LOCAL DATABASE (SQLite on your computer/phone)**

```
WHAT STAYS LOCAL (Encrypted):
✓ Blood test values (glucose, cholesterol, testosterone, etc)
✓ Medical PDFs
✓ Doctor notes
✓ Personal health history
✓ Password hash

HOW IT WORKS:
1. You log in with password
2. Password creates encryption key
3. All medical data encrypted with AES-256
4. Only you can decrypt (need password)
5. Completely offline
6. No internet needed

FILE LOCATION:
- Phone: Inside app's private storage
- Laptop: health_tracker.db file
- Can backup manually
```

### **CLOUD DATABASE (Supabase/PostgreSQL)**

```
WHAT GOES TO CLOUD (Aggregated only):
✓ Daily summary (avg heart rate, steps)
✓ Weekly trends
✓ Recovery score (number only)
✓ Settings & preferences
✗ NO blood test values
✗ NO meal details
✗ NO workout details
✗ NO medical PDFs

WHY:
- Optional cloud sync
- Multi-device access
- Backup your data
- Only aggregated stats (not sensitive)

HOW IT WORKS:
1. Every night: summarize daily data
2. Send only aggregated numbers to Supabase
3. If Supabase quota hit: store locally (FIFO)
4. When quota available: retry sync
5. Never send sensitive medical data
```

---

## **AI/ML: WHERE YOUR INTELLIGENCE COMES FROM**

### **GEMMA (Local LLM for Chat)**

```
WHAT IT DOES:
- Answers health questions
- Explains medical tests
- Gives lifestyle advice
- Runs completely locally

HOW TO USE:
1. Install Ollama (ollama.ai)
2. Run: ollama pull gemma:7b
3. Run: ollama serve (in background)
4. App connects to http://localhost:11434

EXAMPLE:
User: "My glucose is 115. What does that mean?"
Gemma: "Glucose 115 is slightly elevated.
Recommendations: reduce refined carbs,
walk after meals, retest in 6 weeks."

PRIVACY:
- Runs on your computer
- Your data never leaves device
- No internet required
- 100% private
```

### **CUSTOM ML MODELS (Your Personal AI)**

```
WHAT THEY DO:
- Predict your recovery score (after 60 days)
- Predict tomorrow's stress level
- Predict sleep quality
- Optimize your nutrition
- Detect health patterns

HOW THEY WORK:
1. Collect 60+ days of your personal data
2. Train model on YOUR patterns
3. Model learns what's normal for YOU
4. Make predictions tailored to YOU
5. Get smarter as you collect more data

WHEN AVAILABLE:
- Week 1-2: Only Gemma (general knowledge)
- Week 3-8: Collect 30-60 days of data
- Week 9+: First predictions (70% accurate)
- Month 6: 85-90% accurate
- Year 1: 95%+ accurate

RUNS WHERE:
- Mobile: TensorFlow Lite (on phone)
- Laptop: Python scikit-learn or ONNX
- All offline (no cloud needed)
```

---

## **KEY SERVICES & WEBSITES**

### **Supabase (Cloud Database - Optional)**
```
Website: https://supabase.com
What it is: PostgreSQL database in cloud
Cost: Free tier is enough for aggregated data
Why: Easy setup, REST API, auth included, free tier

Setup:
1. Go to supabase.com
2. Click "New Project"
3. Follow prompts
4. Copy API URL and key to .env file

What data to send:
- Aggregated daily summaries only
- Weekly trends
- Settings & preferences

What NOT to send:
- Blood test values
- Medical details
- Sensitive health data
```

### **Ollama (Local AI)**
```
Website: https://ollama.ai
What it is: Tool to run AI models locally
Cost: Free
Why: Gemma LLM runs on your computer, no internet needed

Setup:
1. Download from ollama.ai
2. Install for your OS (Windows/Mac/Linux)
3. Run: ollama pull gemma:7b
4. Run: ollama serve (keeps running)
5. App connects to http://localhost:11434
```

### **Expo (Mobile Development)**
```
Website: https://expo.dev
What it is: Framework for React Native
Cost: Free
Why: Instant live preview, no build needed, easy testing

Setup:
1. Create project: npx create-expo-app app-name
2. npm start
3. Scan QR code with Expo Go app
4. Test on your phone instantly
```

### **Vite (Web Development)**
```
Website: https://vitejs.dev
What it is: Fast build tool for web apps
Cost: Free
Why: Instant hot reload, fast builds, easy setup

Setup:
1. npm create vite@latest app-name -- --template react-ts
2. npm install
3. npm run dev
4. Opens at localhost:5173
5. Edit → changes appear instantly
```

---

## **FILE STRUCTURE OVERVIEW**

```
health-tracker-app/
│
├── mobile/                      ← YOUR PHONE APP
│   ├── app/
│   │   ├── (tabs)/dashboard.tsx
│   │   ├── (tabs)/medical.tsx
│   │   ├── (tabs)/food.tsx
│   │   ├── (tabs)/workouts.tsx
│   │   └── (tabs)/settings.tsx
│   ├── components/
│   │   ├── RecoveryCard.tsx
│   │   ├── AlertBanner.tsx
│   │   └── TrendChart.tsx
│   ├── services/
│   │   ├── database.ts         ← SQLite operations
│   │   ├── ai-engine.ts        ← Gemma + ML models
│   │   ├── sync-manager.ts     ← Cloud sync
│   │   └── encryption.ts       ← Encryption/decryption
│   └── package.json
│
├── web/                         ← YOUR LAPTOP APP
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Reports.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   ├── forms/
│   │   │   └── layout/
│   │   ├── services/
│   │   │   ├── database.ts
│   │   │   ├── ai-engine.ts
│   │   │   ├── export.ts       ← PDF generation
│   │   │   └── supabase.ts
│   │   └── App.tsx
│   └── package.json
│
└── .env                        ← Secrets (API keys, URLs)
```

---

## **WHERE TO CODE WHAT**

### **Blood Test Entry (Encrypted)**
File: `services/database.ts`
```typescript
// Encrypt blood test values before storing
async addBloodTest(testData) {
  const encrypted = await encryptBloodTest(testData, encryptionKey);
  await db.insert('blood_tests', encrypted);
}
```

### **Daily Metrics (Raw)**
File: `services/database.ts`
```typescript
// Store daily health data (not encrypted but private)
async addDailyMetric(metricData) {
  await db.insert('daily_metrics', metricData);
}
```

### **AI Predictions (Local)**
File: `services/ai-engine.ts`
```typescript
// Generate predictions from your personal data
async predictRecovery(userId, metrics) {
  // Run model on local machine
  return customModel.predict(metrics);
}
```

### **Cloud Sync (Aggregated)**
File: `services/sync-manager.ts`
```typescript
// Send only summaries to Supabase
async syncDailySummary(userId, date) {
  const summary = { avg_hr, total_steps, recovery_score };
  await supabase.insert('daily_summaries', summary);
}
```

### **Gemma Chat**
File: `services/gemma-api.ts`
```typescript
// Talk to local Gemma AI
async queryGemma(prompt) {
  const response = await fetch('http://localhost:11434/api/generate', {
    prompt: prompt,
    model: 'gemma:7b'
  });
  return response;
}
```

---

## **HOW TO USE THE BIG PROMPT**

### **Step 1: Get the Complete Prompt**
- File: `COMPLETE_AI_CODE_GENERATION_PROMPT.md`
- This document has everything

### **Step 2: Copy the Entire Prompt**
```
1. Open the prompt file
2. Select ALL (Ctrl+A)
3. Copy (Ctrl+C)
```

### **Step 3: Paste into AI**

**Option A: Claude**
```
1. Go to claude.ai
2. Start new conversation
3. Paste the entire prompt
4. Say: "Build the complete health tracker app
        based on this specification"
5. Claude will generate code files
```

**Option B: ChatGPT**
```
1. Go to chat.openai.com
2. Start new chat
3. Paste the prompt
4. Say: "Generate code for the entire
        health tracker application"
5. ChatGPT will generate code
```

**Option C: Claude Code (Recommended)**
```
1. Go to claude.dev (Claude Code)
2. Start new project
3. Paste the prompt
4. Claude will create complete file structure
5. Download all files as ZIP
6. Extract and run locally
```

### **Step 4: Review & Customize**
```
1. Read generated code
2. Adjust for your preferences
3. Fill in with your Supabase keys
4. Run locally and test
```

---

## **QUICK COMMANDS REFERENCE**

### **Phone App (React Native + Expo)**
```bash
# Create project
npx create-expo-app health-tracker-mobile

# Install dependencies
npm install

# Start development
npm start

# Run on phone
# Scan QR code with Expo Go app

# Build for production
eas build --platform android
eas build --platform ios

# Deploy to app stores
eas submit --platform ios
eas submit --platform android
```

### **Web App (React + Vite)**
```bash
# Create project
npm create vite@latest health-tracker-web -- --template react-ts

# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build

# Deploy to Vercel
npm install -g vercel
vercel deploy --prod --dir=dist
```

### **Database (Supabase)**
```bash
# Create tables
# Go to Supabase dashboard → SQL Editor
# Paste the SQL schema from the prompt
# Click "Run"

# View data
# Go to Supabase dashboard → Tables
# Browse your data

# Backup data
# Supabase Dashboard → Settings → Backups
```

### **Ollama (Local AI)**
```bash
# Pull Gemma model
ollama pull gemma:7b

# Start Ollama service
ollama serve

# Test it works
curl http://localhost:11434/api/generate -d '{"model":"gemma:7b","prompt":"Hello"}'
```

---

## **TROUBLESHOOTING**

### **"Port 11434 already in use" (Ollama)**
```bash
# Ollama is already running somewhere else
# Either: Close other Ollama instance
# Or: Use different port (configure in app)
```

### **"Supabase connection failed"**
```bash
# Check:
1. SUPABASE_URL in .env is correct
2. SUPABASE_ANON_KEY in .env is correct
3. Supabase project is running (dashboard)
4. Internet connection works
```

### **"SQLite error: database is locked"**
```bash
# Too many connections to local database
# Wait a moment and retry
# Or restart the app
```

### **"Expo Go app won't connect"**
```bash
# Make sure:
1. Phone and laptop on same WiFi
2. Firewall not blocking
3. Run: npm start and scan fresh QR code
4. Try: npm start --tunnel
```

---

## **WHICH FILE TO EDIT FOR WHAT**

| What you want to change | File to edit |
|---|---|
| Dashboard layout | `app/(tabs)/dashboard.tsx` (mobile) or `src/pages/Dashboard.tsx` (web) |
| Blood test form | `modals/add-blood-test.tsx` (mobile) or `components/forms/BloodTestForm.tsx` (web) |
| Charts | `components/TrendChart.tsx` (mobile) or `src/components/charts/` (web) |
| Colors/theme | `components/ui/` files or Tailwind config |
| Database schema | `services/database.ts` |
| AI models | `services/ai-engine.ts` |
| Cloud sync | `services/sync-manager.ts` |
| Encryption | `services/encryption.ts` |
| Gemma integration | `services/gemma-api.ts` |
| API keys | `.env` file |

---

## **ESTIMATED DEVELOPMENT TIME**

```
Project Structure Setup:       1-2 hours
Database & Encryption:         4-6 hours
Mobile App UI:                 8-12 hours
Web App UI:                    8-10 hours
Data Input Forms:              6-8 hours
Dashboard:                     4-6 hours
Gemma Integration:             2-3 hours
Supabase Sync:                 4-6 hours
Testing & Debugging:           6-8 hours
─────────────────────────────────────
TOTAL:                         45-60 hours

If full-time (8 hours/day):    6-8 days
If part-time (2-3 hours/day):  2-3 weeks
```

---

## **SUMMARY: WHAT YOU NEED**

```
INSTALL:
☐ Node.js 18+ (nodejs.org)
☐ VS Code (code.visualstudio.com)
☐ Ollama (ollama.ai)
☐ Git (git-scm.com)

PHONE:
☐ Expo Go app (from app store)

CLOUD (Optional):
☐ Supabase account (supabase.com)

LOCAL:
☐ React Native + Expo (for phone app)
☐ React + Vite (for laptop app)
☐ SQLite (local database)
☐ Gemma 7B (local AI)

SERVICES:
☐ Supabase (cloud database)
☐ Ollama (local AI)

LANGUAGES:
☐ TypeScript (preferred)
☐ JavaScript (fallback)
☐ SQL (database queries)
☐ Python (optional, for ML training)
```

---

**YOU'RE READY TO BUILD!**

Next step:
1. Read `COMPLETE_AI_CODE_GENERATION_PROMPT.md`
2. Copy the entire prompt
3. Paste into Claude/ChatGPT
4. Let AI generate your code
5. Download files
6. Run locally
7. Test on your phone + laptop

Good luck! 🚀
