lif.os — Project Status & TODO
Last updated: 2026-10-05 (after a full error-fix + UI/UX pass)
Verification: `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors, 0 warnings
             every screen below was exercised in a live browser session at localhost:8081

═══════════════════════════════════════════════════════════════════
WHAT CHANGED IN THIS PASS
═══════════════════════════════════════════════════════════════════

ERRORS FIXED
  [x] Boot crash `ExpoSecureStore.default.getValueWithKeyAsync is not a function`
      Root cause: expo-secure-store ships `export default {}` on web, so any call
      from a browser throws. Fixed permanently with services/key-value-store.ts —
      one platform-aware store (SecureStore on native, localStorage on web, never
      throws). encryption.ts and supabase.ts now use it; the duplicated
      encryption.web.ts / supabase.web.ts shims were deleted so there is a single
      implementation of the crypto instead of two that could drift.
  [x] `Cannot read properties of undefined (reading 'xFileControl')` (expo-sqlite web)
      Fixed by metro.config.js (registers `wasm` in assetExts) + services/database.web.ts.
  [x] App could hang forever on the splash screen if the DB or settings read failed.
      Boot now degrades instead of blocking; a boot failure is shown on the splash.
  [x] Unreachable screens: dashboard/medical/food/workouts were hidden tabs with no
      entry point, which made weight + recovery logging impossible from the UI.
      The Health hub now has a "Today" card that opens the dashboard.
  [x] Dark-mode contrast: 9 places hardcoded palette.warmBlack for text/icons, which
      is invisible on the dark background. All now use inkOn(isDark) / mutedOn(isDark),
      and the health/brain/calendar sub-screen headers follow the theme via
      stackScreenOptions(isDark).
  [x] Knowledge graph: long-press-to-mark-learned did nothing on web (react-native-svg
      has no onLongPress) and logged 7 React DOM warnings. The gesture was replaced
      with a visible "Mark learned" button; the warnings are gone.
  [x] Failed AI calls showed the raw `Failed to fetch`. Now a clear message telling you
      to start Ollama; the AI buttons disable themselves while Gemma is offline.
  [x] Layout: hardcoded-radii/`Screen` lint warning cleared; lint is now warning-free.

UI/UX BUILT
  [x] Interactive body map (constants/body-map.ts + components/BodyMap.tsx)
      Replaces the "3D body map comes next" placeholder. 10 tappable SVG regions, each
      mapped to the lab panels that describe it. Region colour = latest in-range status
      (in range / below / above / no data), falling back to the newest reading per panel.
      Selecting a region shows its blurb, its latest values with status chips, a "Trend"
      button that drives the chart below, and filters the lab list to that region.
      Verified live: a glucose reading of 140 mg/dL turned the "Gut & metabolism"
      region red and appeared in the region panel.
  [x] Health hub card copy updated; empty states are now filter-aware
      ("No labs for Gut & metabolism" instead of a misleading "No labs yet").

DOCUMENTATION CORRECTIONS (the previous version of this file was wrong)
  ! "SQLite database with 7 tables"      → the schema creates 21 tables
  ! "Password hashing (PBKDF2)"          → it is a single unsalted SHA-256 round
                                           (see REMAINING WORK #6)


═══════════════════════════════════════════════════════════════════
VERIFIED WORKING (tested end to end this session)
═══════════════════════════════════════════════════════════════════

AUTH
  [x] Create passcode, wrong passcode rejected, correct passcode unlocks
  [x] Re-load of the app boots to the unlock screen with no console errors

TABS
  [x] Todo — add task, toggle complete, delete
  [x] Brain hub → Knowledge Graph (add niche, node detail, learned toggle),
      Books & Media, Skills & Marks, College (add item → saved), Finance
      (add transaction → balance, category chart and list all update),
      Stocks & Crypto, AI Insights (offline state shown, graceful failure)
  [x] Health hub → Today/dashboard (log metrics: weight 71.5 kg saved + shown),
      Body Reports (add lab → alert, chart, list, body map all update),
      Hydration & Food (hydration write verified earlier),
      Gym & Activity (log workout → 1 session/35 min; activity modal →
      heart 58 bpm, steps 8200, sleep 7.5 h, stress 3/10),
      Grooming (Wear / Skincare / Schedule / Dressup all render, dark FAB visible)
  [x] Calendar → day view with cross-module rollup (steps/sleep/HR, meals, workouts,
      labs, trips), Add trip → saved, trip detail with route map, and the trip
      correctly appeared in Todo as "Travel: Home → Campus"


═══════════════════════════════════════════════════════════════════
REMAINING WORK
═══════════════════════════════════════════════════════════════════

1. Cloud Sync (Supabase) — Priority: Low
   Status: client + settings UI + sync-manager exist; cannot be exercised without
   real credentials (mobile/.env holds placeholders). Optional: the app is
   offline-first by design.

2. AI Features (Gemma) — Priority: Low
   Status: service + UI complete and now fails gracefully. Needs a local Ollama
   instance with the gemma model pulled to return answers.

3. True 3D body map — Priority: Low
   The interactive body map shipped above is 2D SVG. A real 3D model
   (expo-gl / three.js) was deliberately not added: heavy native dependency,
   no web parity, and the 2D map already delivers the feature's value.

4. Automated Tests — Priority: Medium
   Status: still none in the repo (0 test files). All verification so far is
   manual. This is the biggest remaining engineering risk.

5. Database-at-rest details — Priority: Medium
   - Passcode KDF is a single unsalted SHA-256 round; it should be an iterated
     KDF (PBKDF2/scrypt) with a stored salt.
   - `expo-sqlite` is opened without SQLCipher, so only the sensitive columns
     (blood tests, notes) are AES-256 encrypted, not the whole file.

6. Web preview is a preview, not a platform
   The browser build runs on an in-memory SQL shim (services/database.web.ts) and
   localStorage instead of the keychain, so data does not survive a page reload.
   Native SQLite (services/database.ts) is untouched and remains the real target.
   Browser history/back navigation can also desync from the rendered tab.

7. Store listing + build & deploy — Priority: High for launch
   [ ] 4-6 screenshots (1080x1920)
   [ ] 512x512 app icon
   [ ] Store description + privacy policy
   [ ] Signed APK / AAB build (eas.json exists) and Play Console upload

KNOWN NON-ISSUES (do not "fix" these)
  - `props.pointerEvents is deprecated` and `"shadow*" style props are deprecated`
    come from inside react-native-paper (node_modules), not from app code. Checked:
    no app file passes pointerEvents or shadow* props.


═══════════════════════════════════════════════════════════════════
HOW TO RUN
═══════════════════════════════════════════════════════════════════

  Native:  cd mobile && npx expo start
  Web:     cd mobile && npm run web        (serves on http://localhost:8081)
           --clear after changing metro.config.js or platform files

  Preview passcode used during testing: lifos123
  (web keys live in localStorage; the in-memory DB resets on reload)

  Checks:  cd mobile && npx tsc --noEmit && npm run lint


═══════════════════════════════════════════════════════════════════
SUMMARY
═══════════════════════════════════════════════════════════════════

  Code health ............ 0 type errors, 0 lint errors, 0 lint warnings
  Runtime ................ no uncaught errors on any screen tested
  Core flows ............. verified working end to end
  3D body map ............ replaced with a working interactive body map
  Blocking bugs .......... none known
  Ready to deploy ........ functionally yes; store assets and a KDF upgrade remain
