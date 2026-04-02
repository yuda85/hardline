# Workout Feature — Gap Completion Plan

Prioritized plan to address missing functionality in the workout feature. Ordered by user impact.

---

## Phase 1: Session Resilience (High Impact, Core UX)

### 1.1 Session Recovery
**Problem**: If the user closes the app mid-workout, there's no way to resume.
**Solution**:
- On app load, query `SessionRepository.getActive(userId)` for sessions where `completedAt == null`
- If found, show a "Resume Workout?" dialog with session details (plan name, day, sets completed, elapsed time)
- "Resume" rehydrates `ActiveWorkoutComponent` state from the persisted session
- "Discard" calls `AbandonSession`
- Add a `WorkoutState` init action that checks for orphaned sessions

**Files to change**:
- `workout.state.ts` — add `ResumeSession` action, check on `FetchPlans`
- `session.repository.ts` — `getActive()` already exists, just wire it up
- `active-workout.component.ts` — accept resumed session state
- `workout-list.component.ts` — show resume banner if active session exists

**Estimated effort**: Medium

### 1.2 Offline Support
**Problem**: Real-time Firebase dependency means sets can fail to save on poor gym wifi.
**Solution**:
- Enable Firestore offline persistence (`enableMultiTabIndexedDbPersistence`)
- Queue writes locally, sync when reconnected (Firestore handles this natively)
- Add a connection status indicator in `ActiveWorkoutComponent` header
- Show "Saved locally" vs "Synced" badge on set completion

**Files to change**:
- `app.config.ts` — enable Firestore persistence
- `active-workout.component.ts` — add connection status signal

**Estimated effort**: Small

---

## Phase 2: Progression Tracking (High Impact, Retention)

### 2.1 Workout History & Volume Charts
**Problem**: No way to see progression over time.
**Solution**:
- New route: `/workouts/history`
- `WorkoutHistoryComponent` showing past sessions as a timeline
- Per-exercise volume chart (weight x reps over sessions) using a lightweight chart library
- Weekly/monthly volume totals by muscle group
- New repository method: `SessionRepository.getByExercise(userId, exerciseId, limit)`

**New files**:
- `features/workout/workout-history/workout-history.component.ts`
- `core/models/workout.model.ts` — add computed volume types

**Files to change**:
- `session.repository.ts` — add `getByExercise()`, `getByDateRange()`
- `app.routes.ts` — add history route
- `workout-list.component.ts` — add "History" nav link

**Estimated effort**: Large

### 2.2 RPE / Difficulty Tracking
**Problem**: Only raw weight/reps logged, no subjective difficulty.
**Solution**:
- Add optional `rpe?: number` (1-10 scale) to `SessionSet` model
- Show RPE selector after completing a set (skippable, tappable 1-10 scale)
- Display RPE trend in history charts
- Add session-level `difficulty?: number` (1-5 stars) to `WorkoutSession`, prompted at finish

**Files to change**:
- `workout.model.ts` — add `rpe` to `SessionSet`, `difficulty` to `WorkoutSession`
- `active-workout.component.ts` — RPE input after set completion
- `session-summary.component.ts` — difficulty rating prompt
- `workout.state.ts` — update `CompleteSet` and `FinishSession` actions

**Estimated effort**: Medium

### 2.3 Session Notes
**Problem**: Can't add post-workout notes.
**Solution**:
- Add `notes?: string` to `WorkoutSession` model
- Text area on `SessionSummaryComponent` before finishing
- Display notes in workout history

**Files to change**:
- `workout.model.ts` — add `notes` to `WorkoutSession`
- `session-summary.component.ts` — add notes textarea
- `workout.state.ts` — persist notes on session save

**Estimated effort**: Small

---

## Phase 3: Smarter Planning (Medium Impact, Power Users)

### 3.1 Program Scheduling / Auto-Rotation
**Problem**: Users manually pick which day to do. No program structure.
**Solution**:
- Add `nextDayNumber` to `WorkoutPlan` — auto-advances after completing a day
- Show "Next: Push Day" on plan card with quick-start button
- Cycle through days (day 3 → back to day 1)
- Track `lastCompletedAt` per plan for rest day awareness

**Files to change**:
- `workout.model.ts` — add `nextDayNumber`, `lastCompletedAt` to `WorkoutPlan`
- `workout.state.ts` — update `FinishSession` to advance `nextDayNumber`
- `workout-list.component.ts` — show next day highlight and quick-start
- `workout.repository.ts` — update plan on day completion

**Estimated effort**: Medium

### 3.2 Plan Balance Analysis
**Problem**: No warning for unbalanced plans (e.g., 4 chest exercises, 0 back).
**Solution**:
- Utility function: analyze a plan's muscle group distribution across all days
- Show distribution bar chart in `PlanEditorComponent`
- Warn if any muscle group is >40% or <10% of total volume
- Suggest missing muscle groups

**New files**:
- `core/services/plan-analysis.service.ts`

**Files to change**:
- `plan-editor.component.ts` — add balance analysis panel

**Estimated effort**: Medium

### 3.3 Exercise Substitution During Session
**Problem**: Can't swap an exercise mid-workout (equipment taken, injury).
**Solution**:
- "Swap" button per exercise in `ActiveWorkoutComponent`
- Opens exercise picker filtered to same muscle group
- Replaces exercise in session (not in plan)
- Logs the substitution

**Files to change**:
- `active-workout.component.ts` — add swap action
- `workout.state.ts` — add `SwapExercise` action
- `workout.model.ts` — add `substitutedFrom?: string` to `SessionExercise`

**Estimated effort**: Medium

---

## Phase 4: Enhanced Experience (Lower Priority, Polish)

### 4.1 Exercise Media / Form Cues
**Problem**: Text-only exercise descriptions.
**Solution**:
- Add `videoUrl?: string` and `thumbnailUrl?: string` to `Exercise` model
- Show thumbnail in exercise list, tap for video overlay
- Source: link to external video URLs (YouTube embeds or hosted mp4s)
- Show key form cues as bullet points during active workout

**Files to change**:
- `workout.model.ts` — extend `Exercise` interface
- `exercise-data.ts` — add URLs to exercise library
- `active-workout.component.ts` — form cues display
- `day-detail.component.ts` — video thumbnails

**Estimated effort**: Large (content creation is the bottleneck)

### 4.2 Rest Tracking Between Muscle Groups
**Problem**: Rest timer only works within exercise groups, not between them.
**Solution**:
- Auto-trigger a configurable rest timer when moving to the next exercise group
- Default: 120s between groups (vs 60-90s between sets)
- Allow per-group override in plan editor

**Files to change**:
- `active-workout.component.ts` — trigger rest on group transition
- `workout.model.ts` — add `restBetweenGroups?: number` to `WorkoutDay`
- `plan-editor.component.ts` — between-group rest config

**Estimated effort**: Small

### 4.3 Workout Templates / Community Sharing
**Problem**: Only 2 sample plans, no way to share.
**Solution**:
- Export plan as shareable link (encode plan JSON in URL or use a shared Firestore collection)
- Browse community-submitted plans
- Rate/favorite plans

**Estimated effort**: Large (requires backend work + moderation)

---

## Implementation Order Summary

| Priority | Item | Effort | Depends On |
|----------|------|--------|------------|
| P0 | 1.1 Session Recovery | Medium | — |
| P0 | 1.2 Offline Support | Small | — |
| P1 | 2.1 History & Charts | Large | — |
| P1 | 2.2 RPE Tracking | Medium | — |
| P1 | 2.3 Session Notes | Small | — |
| P2 | 3.1 Auto-Rotation | Medium | — |
| P2 | 3.2 Plan Balance | Medium | — |
| P2 | 3.3 Exercise Swap | Medium | — |
| P3 | 4.1 Exercise Media | Large | — |
| P3 | 4.2 Between-Group Rest | Small | — |
| P3 | 4.3 Community Sharing | Large | 4.1 |

All items are independent unless noted. P0 and P1 items can be parallelized.
