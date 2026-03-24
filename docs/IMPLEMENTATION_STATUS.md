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
- [ ] Firebase Auth (Google sign-in)
- [ ] Auth guard
- [ ] User session persistence
- [ ] Login page UI

### Step 4: User Profile
- [ ] Firestore user document structure
- [ ] Onboarding form
- [ ] Editable profile page
- [ ] Goals & preferences

### Step 5: Nutrition Logging (MVP)
- [ ] Manual food entry
- [ ] AI text -> structured meal
- [ ] Meal data model (items, calories, macros, source, confidence)
- [ ] Nutrition log UI

### Step 6: AI Integration (Basic)
- [ ] AI service (text input -> structured JSON)
- [ ] Response validation against schema
- [ ] Error handling & fallback

### Step 7: Workout System (MVP)
- [ ] Exercise library (static)
- [ ] Workout plan builder
- [ ] Active Workout Mode (guided, full-screen)
  - [ ] Step-by-step exercise flow
  - [ ] Set/rep logger with tap-to-complete
  - [ ] Rest timer with countdown
  - [ ] Vibration + audio alerts
  - [ ] Screen wake lock
  - [ ] Session summary
- [ ] Workout session logger

### Step 8: JSON Import / Export
- [ ] Export workout plan as JSON
- [ ] Import with validation

### Step 9: Dashboard (Basic)
- [ ] Calories remaining widget
- [ ] Protein vs goal widget
- [ ] Last workouts widget
- [ ] Weight trend (basic)

### Step 10: Deployment
- [ ] Configure Angular for GitHub Pages
- [ ] Fix routing issues (404.html)
- [ ] Verify PWA works after deploy

---

## Phase 2: Depth (Future)

- [ ] AI image food analysis
- [ ] Recipes & "pot" system
- [ ] Workout analytics
- [ ] AI coach (context-aware)
- [ ] Notifications
- [ ] Offline sync improvements
