# Hardline — Implementation Status

## Phase 1: Foundation + MVP

### Step 1: Project Setup

- [x] Create Angular app
- [x] Enable PWA (service worker + manifest)
- [x] Setup Firebase project config
- [x] Configure Auth, Firestore, Storage providers
- [x] Setup environment configs (dev + prod)
- [x] Create folder structure (core, shared, features, data)
- [x] Configure GitHub Pages deployment
- [x] Set up design system (SCSS tokens, fonts, responsive foundation)

### Step 2: Core Architecture

- [x] NGXS state management (auth, profile, nutrition, workout stores)
- [x] Firebase abstraction layer (BaseRepository + 5 concrete repos)
- [x] Core models (user, nutrition, workout, common)
- [x] Auth service (Google sign-in wrapper)
- [x] Shared UI components (button, card, input, icon-button, badge, skeleton, bottom-nav, side-nav)
- [x] CLAUDE.md updated with NGXS usage rules

### Step 3: Authentication

- [x] Firebase Auth (Google sign-in via popup)
- [x] Auth guard (functional, waits for init, redirects to /login)
- [x] User session persistence (NGXS storage plugin + Auth.Init on bootstrap)
- [x] Login page UI (full-screen, dark, centered, Google sign-in button)
- [x] App shell layout (side-nav desktop + bottom-nav mobile + router-outlet)
- [x] Lazy-loaded routes with auth guard
- [x] Loading splash screen while auth initializes

### Step 4: User Profile

- [x] Firestore user document structure (with onboardingComplete flag)
- [x] Onboarding form (2-step: nutrition goals + preferences)
- [x] Onboarding guard (redirects new users before they can access app)
- [x] Editable profile page (view/edit mode with goals, preferences, avatar)
- [x] Goals & preferences saved to Firestore via NGXS Profile store
- [x] Profile route added to layout nav

### Step 5: Nutrition Logging (MVP)

- [x] Manual food entry (bottom sheet form with multi-item support)
- [x] AI text -> structured meal (Step 6)
- [x] Meal data model (items, calories, macros, source, confidence)
- [x] Nutrition log UI (daily view with date navigation)
- [x] Macro summary bar (calorie ring + protein/carbs/fat progress bars)
- [x] Add/remove meals connected to NGXS store + Firestore
- [x] Skeleton loading states
- [x] Empty state with CTA

### Step 6: AI Integration (Basic)

- [x] AI service using Firebase AI SDK (Gemini 2.0 Flash)
- [x] Text-to-meal parsing with structured JSON prompt
- [x] Response validation (JSON extraction, schema enforcement, sanitization)
- [x] Error handling (parse failures, API errors, fallback messages)
- [x] AI meal input component (textarea + analyze + preview + confirm)
- [x] Integrated into nutrition page with "ai_text" source badge

### Step 7: Workout System (REDESIGNED)
- [x] **New data model:** Plan → Days → ExerciseGroups → Exercises → Sets
- [x] Exercise library (24 exercises with synonym tags for search)
- [x] Superset & circuit support (grouped exercises, shared rest)
- [x] Per-set rep targets (pyramid sets: 12, 10, 8, 6)
- [x] 2 sample plans: Push Pull Legs (3 days) + Upper/Lower (4 days)
- [x] Workout list with expandable day cards
- [x] Active Workout Mode (full redesign)
  - [x] Exercise list bottom sheet (tap to jump to any exercise)
  - [x] Set/rep logger with per-set targets + weight input
  - [x] Rest timer with **+15s button** to extend rest
  - [x] Vibration + audio alerts
  - [x] Screen wake lock
  - [x] **Last session recall** (shows previous weight/reps as hints)
  - [x] **1RM calculation** (Epley formula) with PR tracking
  - [x] **New PR banner** animation when PR is beaten
  - [x] Superset/circuit badge on exercise
  - [x] Progress bar + elapsed timer + set dots
- [x] Session summary with PR badges and per-exercise breakdown
- [x] PersonalRecord repository + OneRepMaxService
- [x] NGXS store: FetchPlans, SavePlan, UpdatePlan, DeletePlan, LoadLastSession, LoadPRs
- [x] Import/Export updated to v2 schema (day-based structure)
- [x] Plan editor UI (Workout Builder)
  - [x] Template picker (Blank, PPL, Upper/Lower, Full Body)
  - [x] Exercise picker (muscle group tabs + search by name/tags + create custom)
  - [x] Set editor (per-set rep targets, rest time presets, exercise notes)
  - [x] Drag & drop reorder exercises and days (Angular CDK)
  - [x] Superset creation and management
  - [x] Duplicate plan and duplicate day
  - [x] Exercise swap (replace with same muscle group alternative)
  - [x] Edit existing plans

### Step 8: JSON Import / Export
- [x] Export workout plan as JSON (download file with versioned schema)
- [x] Import with validation (file picker, schema validation, error display)
- [x] WorkoutIOService (export/import logic with strict validation)
- [x] Export/import/delete buttons on each plan card

### Step 9: Dashboard
- [x] Personalized greeting header
- [x] Energy Balance card with calorie ring + macro bars
- [x] Net balance card (deficit/surplus)
- [x] Calories remaining, protein, meals today, workout goal stat cards
- [x] Recent Workouts card
- [x] Bento grid layout (responsive)
- [x] Updated to use Energy store (replaced old Nutrition references)

### Energy Balance Module (NEW — replaces Nutrition)
- [x] **Models:** GoalSettings, Meal (with mealType), CardioEntry, DailySteps, WeightEntry, DailySummary, WeeklySummary
- [x] **Calculation Engine:** BMR (Mifflin-St Jeor), TDEE, calorie targets, macro splits, step/workout/cardio burn estimates, dynamic macro calculator, daily/weekly aggregation
- [x] **Repositories:** goal-settings, meal (updated), cardio, steps, weight, daily-summary, weekly-summary
- [x] **NGXS Store:** EnergyState with LoadGoalSettings, SaveGoalSettings, FetchDayData, AddMeal, RemoveMeal, AddCardio, RemoveCardio, UpdateSteps, RecalculateDailySummary, FetchWeeklySummary, RecalculateWeeklySummary
- [x] **Goals & Targets page:** age/sex/height/weight/goal/rate/activity/steps/macros with live BMR→TDEE→calories→macros preview
- [x] **Energy Home page:** calorie ring, macro bars, balance card, steps, burn, meals count, quick actions
- [x] **Food Log page:** date nav, meals grouped by type (breakfast/lunch/dinner/snack), add meal sheet with type selector
- [x] **Activity & Burn page:** burn breakdown (BMR/steps/workout/cardio), steps input, auto-pulled workout sessions, cardio log with add form
- [x] **Daily Summary page:** full day breakdown (intake vs burn vs balance), weight entry
- [x] **Weekly Summary page:** week nav, averages (intake/burn/balance/protein), adherence %, workout completion, weight trend
- [x] **Shared widgets:** CalorieRing, MacroBars, BalanceCard
- [x] **Old Nutrition module deleted**, all references updated
- [x] **Nav updated:** "Nutrition" → "Energy" with bolt icon

### Step 10: Deployment
- [x] Production build passes (694 kB initial, 186 kB transferred)
- [x] `build:prod` script with `--base-href /Hardline/`
- [x] GitHub Actions workflow auto-deploys on push to main
- [x] 404.html SPA routing trick configured
- [x] PWA manifest + service worker configured for `/Hardline/`
- [ ] Add GitHub Pages domain to Firebase Auth authorized domains
- [ ] Push to main branch to trigger first deployment

---

## Phase 2: Depth (Future)

- [ ] AI image food analysis
- [ ] Recipes & "pot" system
- [ ] Workout analytics
- [ ] AI coach (context-aware)
- [ ] Notifications
- [ ] Offline sync improvements

## my inputs

- [ ] better mechanizem for goals in nutrition - calories with macro auto update, BMR calc, etc
- [ ] cloud functions for security ai
- [ ] security
