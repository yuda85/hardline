# Workout Feature — AI Design Prompt

Use this prompt with an AI design tool (v0, Galileo, etc.) to generate UI designs for the Hardline workout feature.

---

## Prompt

Design a mobile-first dark-themed workout tracker app called **Hardline**. The app uses a gym-focused design language — clean, high-contrast, and information-dense without feeling cluttered. All screens target **375px width** as the base, scaling up to tablet/desktop.

### Design System

- **Theme**: Dark mode only
- **Background**: `#131313` (surface), `#0e0e0e` (lowest), `#1c1b1b` (low), `#201f1f` (container), `#2a2a2a` (high), `#353534` (highest)
- **Primary accent**: `#3cd7ff` (cyan), container: `#009ebe`
- **Secondary**: `#c8c6c5` (warm grey)
- **Tertiary/Warning**: `#ffb595` (warm orange), container: `#ef6719`
- **Error**: `#ffb4ab`
- **Text on surface**: `#e5e2e1`
- **Text on surface variant**: `#c1c6d7`
- **Outline**: `#8b90a0`, variant: `#414755`
- **Headline font**: Manrope (weights: 200, 400, 600, 800)
- **Body/Label font**: Inter (weights: 300, 400, 500, 600)
- **Corner radius**: Use MD3 tokens (small: 8px, medium: 12px, large: 16px, extra-large: 28px)
- **Elevation**: Use surface tint `#3cd7ff` at low opacity for elevation layers
- **Icons**: Material Symbols Outlined (variable weight/fill)

### Screens to Design

#### 1. Workout Plan List (`/workouts/`)
- Card-based list of user's workout plans
- Each card shows: plan name, description, number of days, and an expand toggle
- Expanded card reveals day names with exercise count per day and group-type badges (SS = superset, CIR = circuit)
- Each day row has: "Preview" and "Start" action buttons
- Top bar: "Import Plan" and "New Plan" buttons
- Empty state with illustration and "Create your first plan" CTA
- Bottom action: "Load Sample Plans" (PPL, Upper/Lower templates)

#### 2. Day Detail / Preview (`/workouts/day/:planId/:dayNumber`)
- Header: day name + plan name breadcrumb
- Equipment summary chips at top (e.g., "Barbell", "Dumbbells", "Cable")
- Exercise list grouped by ExerciseGroup:
  - Single exercises: name, sets x reps scheme, rest time
  - Supersets: visually connected pair with "SS" badge
  - Circuits: grouped block with "Circuit" badge
- Each exercise shows: muscle group tag, notes if present
- Footer stats: total exercises, total sets
- Primary CTA: "Start Workout" full-width button

#### 3. Active Workout (`/workouts/active/:planId/:dayNumber`) — MOST IMPORTANT
This is the core experience. Design for one-handed use during a gym session.

**Top section:**
- Elapsed time (mm:ss), updating live
- Progress bar showing percent of total sets completed
- "Exercise X of Y" counter

**Main section:**
- Current exercise name (large, bold)
- Current PR display below name (e.g., "PR: 85kg est. 1RM")
- Completed sets log: list of finished sets showing "Set 1: 60kg x 10 (est. 1RM: 80kg)"
- Set completion dots (filled = done, empty = remaining)

**Input section (thumb-reachable at bottom):**
- Weight input (kg) with "Last: 60kg" hint from previous session
- Reps input with "Last: 10" hint
- Large "Complete Set" primary button
- Smaller "Add Set" text button

**Rest timer overlay:**
- Circular countdown timer (fills the middle of screen)
- Remaining seconds in large text
- "+15s" and "Skip" buttons
- Auto-dismisses when timer ends

**Exercise navigation:**
- Prev/Next arrows flanking exercise name
- Bottom sheet: scrollable exercise list with completion checkmarks, tap to jump

**Notifications:**
- PR toast: celebratory banner "New PR! 85kg est. 1RM" with accent animation
- Finish confirmation dialog when all sets done

**Header actions:**
- "Finish" button (when exercises remain: shows confirmation with save/discard options)

#### 4. Session Summary (`/workouts/summary`)
- Duration (large hero number)
- Stats grid: total volume (kg), sets completed, total reps
- New PRs section: list of exercises with new PR badge and the weight/reps
- "Back to Workouts" button

#### 5. Plan Editor (`/workouts/edit/:planId`)
- Plan name input at top
- Optional description textarea
- Template selector (Blank, PPL, Upper/Lower) for new plans only
- Day tabs or vertical day list, each collapsible:
  - Day name (editable inline)
  - Drag handle for reordering
  - Exercise groups within day:
    - Single: exercise name + set scheme
    - Superset: connected pair with visual bracket
  - "Add Exercise" and "Add Superset" buttons per day
  - Rest time selector per group (preset chips: 60s, 90s, 120s, 180s, custom)
- Per-exercise actions: swap, delete, edit sets, add notes
- Set editor inline: rows of target reps with +/- buttons
- "Add Day" button at bottom of day list
- Save/Cancel in header

#### 6. Exercise Picker (modal/bottom sheet)
- Search bar at top
- Muscle group filter chips (All, Chest, Back, Shoulders, Legs, Arms, Core)
- Exercise list: name, muscle group badge, equipment tag
- "Create Custom Exercise" option at bottom
- Tap to select, returns to editor

### Design Principles
- **Thumb-zone optimization**: All primary actions in bottom 40% of screen during active workout
- **Glanceable**: Key info (weight, reps, progress) readable at arm's length
- **Minimal taps**: Complete a set in 2-3 taps max (enter weight → enter reps → complete)
- **High contrast**: Text on dark backgrounds must pass WCAG AA for the gym environment (bright lights, sweat on screen)
- **Haptic-ready**: Design button sizes for touch targets (min 48x48px)
- **No scroll traps**: Active workout main content should not require scrolling during a set

### Data Model Reference

```
WorkoutPlan
  ├── name, description
  └── days: WorkoutDay[]
        ├── dayNumber, name
        └── exerciseGroups: ExerciseGroup[]
              ├── type: 'single' | 'superset' | 'circuit'
              ├── restSeconds
              └── exercises: PlanExercise[]
                    ├── exerciseId, exerciseName
                    ├── sets: PlanSet[] (targetReps)
                    └── notes?

WorkoutSession (mirrors plan, adds actual data)
  ├── planId, dayNumber, startedAt, completedAt?
  └── exerciseGroups → exercises → sets: SessionSet[]
        ├── targetReps, actualReps, weight
        ├── completed, completedAt?

PersonalRecord
  ├── exerciseId, exerciseName
  ├── oneRepMax, weight, reps, date
```
