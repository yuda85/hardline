# Active Workout & Session Summary — AI Design Prompt

Use this prompt with an AI design tool (v0, Galileo, etc.) to generate polished UI designs for the active workout and session summary screens in Hardline.

---

## Prompt

Design two connected screens for a mobile-first dark-themed gym workout tracker called **Hardline**: the **Active Workout** screen (used during a gym session) and the **Session Summary** screen (shown immediately after finishing). Both are already functionally built — I need a visual design pass to make them feel premium, motivating, and effortless to use mid-workout with sweaty hands and one thumb.

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
- **Corner radius**: small 8px, medium 12px, large 16px, extra-large 28px
- **Elevation**: surface tint `#3cd7ff` at low opacity for elevation layers
- **Icons**: Material Symbols Outlined (variable weight/fill)
- **Target device**: 375px width base (iPhone SE–sized), scaling up

---

## Screen 1: Active Workout (`/workouts/active/:planId/:dayNumber`)

This is the most critical screen in the app. The user is in a gym, between sets, phone in one hand. Everything must be glanceable, thumb-reachable, and high-contrast.

### Current Layout (what's built — improve on this)

**Header bar** (pinned top):
- Left: X close button (opens quit/save dialog)
- Center: elapsed timer (mm:ss) with small timer icon in cyan
- Right: progress percentage (e.g., "67%") in cyan

**Progress bar**: 4px horizontal bar below header, cyan fill animating on set completion

**Exercise info section** (centered):
- "Exercise 2 of 6" label (small caps) with optional superset/circuit badge
- Exercise name (large bold heading, e.g., "Barbell Bench Press")
- PR chip below name: trophy icon + "PR: 85kg est. 1RM (70kg x 8)" in warm orange pill

**Completed sets log** (compact card):
- Numbered rows: "1 — 60kg x 10 — ~80kg 1RM"
- Each row has a small cyan numbered circle, bold weight x reps, and a dimmed estimated 1RM

**Set progress dots**: Row of 44px circles — filled cyan with checkmark (done), outlined cyan (current), grey (remaining). "Add set" link to the right.

**Input section** (bottom thumb zone — THIS IS KEY):
- "Target: 10 reps" label
- Two large input fields side by side: Weight (kg) and Reps
  - Inputs are oversized (56px tall), bold cyan text, centered
  - Below each: faint "Last: 60kg" / "Last: 10" hint from previous session
- Full-width "Complete Set 3" primary button (cyan, large, 56px tall)

**Rest timer** (replaces input section between sets):
- Large circular countdown (140px), orange border, bold seconds inside
- "REST" label underneath
- "+15s" outline button and "Skip" primary button below
- Should feel like a breathing moment — calming but urgent

**Bottom nav bar** (pinned bottom):
- Prev / Exercises (opens list sheet) / Next
- Always visible, not covered by keyboard

**States to design:**
1. **Logging a set** — input fields visible, button says "Complete Set N"
2. **Resting** — rest timer visible, inputs hidden
3. **Exercise complete** — checkmark icon, "Exercise complete!" text, "Next exercise" button
4. **All done** — checkmark icon, "All exercises done!", "Finish workout" button
5. **PR achieved** — animated banner at top: trophy icon + "New PR! 85kg est. 1RM" in orange

**Dialogs (bottom sheet style on mobile, centered modal on tablet):**
- **Finish confirmation**: "Finish Workout?" / "Save this session to your workout history." / Cancel + Save & Finish buttons
- **Quit confirmation**: "Quit Workout?" / "What do you want to do with this session?" / Save & Finish (primary), Discard session (outline), Continue workout (ghost) — stacked vertically

**Exercise list sheet** (slides up from bottom):
- Scrollable list of all exercises in the session
- Each row: exercise name, completion status (checkmark or set count like "2/4")
- Current exercise highlighted
- Tap to jump to any exercise

### Design Priorities
- **Thumb zone**: Weight input, reps input, and "Complete Set" button must all be reachable with one thumb on a 375px screen. Keep them in the bottom 40%.
- **Glanceable**: Exercise name, set count, and weight/reps should be readable at arm's length (phone on a bench).
- **Minimal taps**: Enter weight → enter reps → tap Complete = 3 interactions per set max.
- **High contrast**: All text must pass WCAG AA on the dark backgrounds. Gym lighting can wash out screens.
- **Large touch targets**: All buttons minimum 48x48px. Input fields 56px tall.
- **No scroll during a set**: The log + input must fit on screen without scrolling for up to ~5 completed sets.
- **Safe areas**: Respect iOS safe areas (notch, home indicator) in header and bottom nav.

---

## Screen 2: Session Summary (`/workouts/summary`)

Shown immediately after the user taps "Save & Finish." This is the reward moment — make it feel like an accomplishment.

### Current Layout (what's built — improve on this)

**Hero section** (centered):
- Trophy icon (3.5rem, warm orange, filled)
- "Workout Complete!" heading
- Duration text (e.g., "42 minutes")

**Stats grid** (3 columns):
- Sets completed (e.g., "24")
- Total reps (e.g., "187")
- Volume in kg (e.g., "4,520")
- Each in an elevated card, bold cyan number + small caps label

**Exercise breakdown** (card):
- Section title: "Exercise Breakdown"
- For each exercise group: optional superset/circuit badge
- For each exercise: name + PR badge if applicable ("1RM: 85kg")
- Below name: row of set pills (e.g., "60kg x 10", "65kg x 8") in grey rounded pills

**CTA**: Full-width "Back to workouts" button

### Design Improvements Wanted
- **Add a new PRs section**: If any PRs were achieved during this session, highlight them prominently — separate card above the exercise breakdown with trophy icons and the new 1RM values. Make this celebratory (subtle glow, accent color).
- **Add comparison to last session**: Show delta indicators — "Volume: 4,520kg (+120)" or "Sets: 24 (same as last)". Green for improvement, grey for same, subtle red for decrease. This requires no new data — the app already loads last session data.
- **Consider an animated entrance**: Stats could count up from 0, cards could stagger-fade in. Keep it snappy (under 800ms total).
- **Add share-ready layout**: Design a compact summary card (fixed dimensions, ~350x500px) that could be exported as an image for social sharing. Dark background, app logo watermark, stats + exercise list. This is a future feature but design it now.

### Design Priorities
- **Celebratory but brief**: The user just finished a workout — they want a dopamine hit, not a data dump. Hero moment first, details below.
- **Scannable**: Key numbers (volume, sets, reps, duration) should pop immediately.
- **PR emphasis**: Any new personal records should be the most visually prominent element after the hero.
- **Quick exit**: The "Back to workouts" CTA should be immediately visible without scrolling on a 375px screen.

---

## Data Model Reference

```
WorkoutSession
  ├── planId, dayNumber
  ├── startedAt (timestamp), completedAt (timestamp)
  └── exerciseGroups: SessionExerciseGroup[]
        ├── type: 'single' | 'superset' | 'circuit'
        ├── restSeconds: number
        └── exercises: SessionExercise[]
              ├── exerciseId, exerciseName
              └── sets: SessionSet[]
                    ├── targetReps, actualReps, weight
                    ├── completed (boolean)
                    └── completedAt? (timestamp)

PersonalRecord
  ├── exerciseId, exerciseName
  ├── oneRepMax (kg), weight (kg), reps
  └── date
```

## Design Principles (for both screens)

- **Dark-on-dark depth**: Use the surface hierarchy (`#131313` → `#353534`) to create visual layers. Cards float above the background. Inputs are the highest surface.
- **Cyan = action/progress**: Primary color is always interactive or indicates forward progress. Don't use it for static decoration.
- **Orange = achievement**: Tertiary color is reserved for PRs, celebrations, rest timers. It should feel warm and earned.
- **Motion**: Keep animations purposeful — set completion dots, rest timer pulse, PR banner entrance. No gratuitous motion. Respect `prefers-reduced-motion`.
- **Typography hierarchy**: Manrope 800 for numbers and headings (the stuff you glance at). Inter 400–500 for labels and body (the stuff you read).
