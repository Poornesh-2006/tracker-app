# lif.os

Private, offline-first health tracker. Blood tests and medical notes are encrypted with AES-256 on-device; nothing is sent to the cloud.

## Repo layout

```
lif.os/
├── mobile/          ← React Native + Expo app (phone)
├── docs/            ← INDEX.md, TODO.md, specs/ (PRD, architecture, schema, deployment)
└── .gitignore
```

The web/desktop app and reports are planned for later phases. See `docs/INDEX.md`.

## Run the phone app

Requirements: Node 18+, the **Expo Go** app on your phone, and your phone on the same Wi-Fi as this computer.

```bash
cd mobile
npm install
npm start
```

Scan the QR code with Expo Go. On first launch you'll create a passcode — it derives the AES-256 key that encrypts your medical data.

Useful commands:

```bash
npm run lint       # eslint
npx tsc --noEmit   # typecheck
npx expo start     # dev server (same as npm start)
```

## What's implemented (MVP)

- Passcode setup / unlock / lock / change passcode (PBKDF2 key derivation, AES-256 encryption)
- Blood test logging with photo capture — values + notes encrypted at rest
- Daily metrics (steps, sleep, resting HR, weight, stress, recovery score)
- Meal logging with macros and photo
- Workout logging with intensity
- Dashboard with recovery card, alerts (reference ranges), and trends (recovery / weight / steps)
- Auto recovery-score calculation from sleep / stress / resting HR (rule-based, in `services/ai-engine.ts`)
- Rule-based AI insights on the dashboard (sleep, activity, training, weight, recovery trends)
- Local Gemma integration (`services/gemma-api.ts`) for health advice and blood-test explanations via Ollama at `http://localhost:11434`
- Optional Supabase cloud sync (`services/sync-manager.ts`) — aggregated daily summaries only, queued locally (FIFO) when offline
- JSON export (decrypted) via the system share sheet
- Light/dark/system theme

## Architecture notes

- `mobile/services/encryption.ts` — key derivation and AES-256 (crypto-js + expo-crypto)
- `mobile/services/database.ts` — SQLite schema + migrations (expo-sqlite)
- `mobile/services/ai-engine.ts` — rule-based recovery score, insights, predictions
- `mobile/services/gemma-api.ts` — local Ollama/Gemma queries (set `EXPO_PUBLIC_*` in `.env.local`)
- `mobile/services/supabase.ts` + `mobile/services/sync-manager.ts` — cloud sync (aggregated daily summaries only, FIFO queue)
- `mobile/services/*-service.ts` — data access per domain
- `mobile/stores/` — zustand stores for auth, data, and settings
- `mobile/app/` — expo-router screens (`(auth)` gating + `(tabs)`)
- `docs/supabase-schema.sql` — run in the Supabase SQL editor to create cloud tables + RLS policies

## Security

- Blood test values and notes are AES-256 encrypted before reaching SQLite.
- The passcode and derived key never leave the device.
- Forgetting the passcode makes encrypted data unrecoverable by design.

## Cloud sync (optional, Supabase)

Only **aggregated daily summaries** are sent to the cloud — never blood test values, medical notes, meals, or workouts.

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the contents of `docs/supabase-schema.sql` to create the `daily_summaries` / `weekly_trends` tables and RLS policies.
3. Copy your project URL and anon key into `mobile/.env.local`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. In the app: **Settings → Cloud sync → toggle on**, then tap **Sync now**.

When offline, summaries are queued in a local `sync_queue` table and pushed in order (FIFO) the next time sync runs.
