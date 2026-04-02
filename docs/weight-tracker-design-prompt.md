# Weight Tracker — Professional Design Prompt

## Overview

Design a **weight tracking feature** for Hardline, a dark-themed mobile-first fitness app built with Angular and Material Design 3. This feature replaces the unused "Builder" nav item and becomes a core pillar alongside Energy (nutrition) and Workouts.

The weight tracker connects to the existing nutrition system to provide calorie-based weight predictions, making it the feedback loop that ties everything together.

---

## Brand & Design System

### Identity
- **App name:** Hardline
- **Personality:** Clean, data-driven, motivating but not gimmicky. Premium dark fitness aesthetic.
- **Target user:** Health-conscious adults tracking body composition alongside nutrition and training

### Color Palette (MD3 Dark Theme)
| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#3cd7ff` | Accent, interactive elements, data lines, active states |
| `--tertiary` | `#ffb595` | Secondary accent, trend lines, streak icons |
| `--error` | `#ffb4ab` | Weight gain indicator, over-target warnings |
| `--surface` | `#131313` | Page background |
| `--surface-container-low` | `#1c1b1b` | Modal/sheet background |
| `--surface-container` | `#201f1f` | Card backgrounds |
| `--surface-container-high` | `#2a2a2a` | Input backgrounds, subtle dividers |
| `--surface-container-highest` | `#353534` | Elevated elements |
| `--on-surface` | `#e5e2e1` | Primary text |
| `--on-surface-variant` | `#c1c6d7` | Secondary/muted text |
| `--outline-variant` | `#414755` | Borders, dividers |
| Success green | `#22c55e` | Weight loss indicator, goal completion, streaks |

### Typography
| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Headline | **Manrope** | 800 | Page titles, large weight values, stat numbers |
| Headline Secondary | **Manrope** | 700 | Section titles, card headers |
| Body | **Inter** | 400–500 | Body text, labels, descriptions |
| Label | **Inter** | 600 | Uppercase labels, badge text, small data |

### Type Scale
- Page title: `clamp(1.5rem, 4vw, 2rem)` — Manrope 800
- Section title: `0.8125rem` — Manrope 700
- Large stat value: `2rem` — Manrope 800
- Medium stat value: `1.5rem` — Manrope 800
- Body: `0.875rem` — Inter 400
- Label (uppercase): `0.6875rem` — Inter 600, `letter-spacing: 0.03–0.05em`
- Caption: `0.75rem` — Inter 400

### Iconography
- **Material Symbols Outlined** (variable weight 100–700, FILL 0–1)
- Key icons for this feature:
  - `monitor_weight` — Nav item, main feature icon
  - `show_chart` — Chart empty state
  - `trending_up` / `trending_down` — Prediction direction
  - `local_fire_department` — Streak
  - `flag` — Goal empty state
  - `settings` — Settings
  - `history` — History
  - `calendar_month` — Weekly recap
  - `analytics` — Prediction empty state
  - `arrow_back` — Navigation back
  - `close` — Modal dismiss
  - `add` — Add entry

### Spacing & Layout
- **Border radius:** `0.75rem` (cards), `0.5rem` (inputs, small elements), `2rem` (badges/pills)
- **Min touch target:** 44px
- **Card gap:** `0.75rem`
- **Section gap:** `1.25rem`
- **Content max-width:** `640px`
- **Safe area insets:** Respected for notched devices

### Effects
- **Glass panel:** `backdrop-filter: blur()` available for overlays
- **Transitions:** `200ms ease` for color/opacity changes, `500ms ease` for progress animations
- **Reduced motion:** Respect `prefers-reduced-motion`

---

## Screens

### 1. Weight Home (`/weight`)

**Purpose:** The main dashboard for weight tracking — at a glance, see current weight, trend, goal progress, predictions, and streak.

**Layout:** Single-column scrollable with bento grid cards (2-column grid, some spanning full width)

#### Sections (top to bottom):

**Header**
- Page title "Weight" (left) + settings gear icon button (right)

**Today's Weight Card** (full width, subtle elevation)
- Large weight number (e.g., "82.5") with "kg" unit label
- Status badge: "Today" (green) if logged today, "Latest" (muted) if not
- This is the hero moment — the number should be the biggest thing on screen

**Trend Chart Card** (full width)
- Section title "Trend" (left) + range toggle tabs "7D | 30D | 90D" (right)
- Pure SVG line chart below:
  - **Data line:** Solid cyan (`#3cd7ff`), 2px stroke, rounded joins
  - **Trend line:** Dashed orange (`#ffb595`), 1.5px stroke, 70% opacity — 7-day moving average
  - **Data points:** Cyan filled circles (r=3.5) with surface stroke
  - **Grid:** Horizontal dashed lines, subtle (`--surface-container-high`)
  - **X-axis labels:** Day abbreviations (7D) or "Mar 15" format (30D/90D)
  - **Y-axis labels:** Weight values with 1 decimal
- Empty state: Chart icon + "No weight data yet"

**Goal Progress Ring** (half-width card)
- Circular SVG ring (follows CalorieRing pattern — 140px for `lg` size)
- Ring background: `--surface-container-high`, 7px stroke
- Ring fill: Cyan primary, animates on load (stroke-dashoffset transition)
- Ring turns green (`#22c55e`) when complete
- Center text: "67%" (large, Manrope 800) + "5.2kg to go" (small label)
- Empty state (no goal set): Ring outline + flag icon + "Set a goal"

**Streak Card** (half-width card)
- Fire icon (tertiary orange)
- Large number (e.g., "12")
- Label "day streak"

**Prediction Card** (full width)
- Header: Trending up/down icon (tertiary) + "Weight prediction"
- Main: "+0.3kg" or "-0.5kg" (large, color-coded — red for gain, green for loss)
- Projected weight: "~82.8kg projected" (muted)
- Detail row: "Avg +250 kcal/day" + badge "7d data"
- Empty state: Analytics icon + "Log meals for 3+ days to see weight predictions"

**Weekly Recap Card** (full width)
- Section title "Weekly recap"
- 2x2 stat grid:
  - Avg weight (Manrope 800, 1.125rem)
  - Change vs last week (color-coded +/- with "vs last week" label)
  - Days logged (e.g., "5/7")
  - Streak (cyan, e.g., "12d")
- Range line at bottom: "Range: 81.5kg – 83.2kg"
- Empty state when <2 days of data

**Milestones Section** (full width, no card wrapper)
- Section title "Milestones"
- Horizontal wrapping pill badges:
  - Weight milestones: Cyan tint background + cyan border + "3kg lost"
  - Streak milestones: Orange tint background + orange border + "14-day streak"
  - Icon inside each pill (trending_down or fire)
- Only shows when milestones exist

**Actions** (full width)
- "View history" outline button with history icon

---

### 2. Weight Entry Modal (overlay on any page)

**Purpose:** Daily prompt to log weight. Appears once per session if today's weight isn't logged.

**Trigger:** App open (any authenticated route) when no entry exists for today

**Layout:** Bottom sheet on mobile (rounded top corners), centered dialog on desktop

#### Structure:

**Backdrop:** Fixed black overlay, 50% opacity, click-to-dismiss

**Sheet/Dialog:**
- Mobile: Bottom-anchored, `border-radius: 1.5rem 1.5rem 0 0`, max 85dvh
- Desktop: Centered, `max-width: 420px`, full rounded corners

**Content (top to bottom):**
1. **Header row:** "Log today's weight" (Manrope 800, 1.25rem) + close X button
2. **Icon + subtitle:** Large `monitor_weight` icon (2.5rem, cyan) + "How much do you weigh today?" (centered)
3. **Weight input:** 
   - Label "WEIGHT (KG)" (uppercase, small)
   - Large centered number input (Manrope 700, 1.5rem, `inputmode="decimal"`)
   - Placeholder "e.g. 73.5"
   - Step 0.1
4. **Notes textarea:**
   - Label "NOTES (OPTIONAL)"
   - 2-row textarea with placeholder "e.g. After breakfast, felt lighter"
5. **Action buttons:** "Skip" (outline) + "Save" (primary, shows loading state)
   - Both buttons flex: 1 for equal width
   - Safe area bottom padding on mobile

---

### 3. Weight History (`/weight/history`)

**Purpose:** Full chronological record of all weight entries, grouped by month

**Layout:** Single-column list with month headers

#### Structure:

**Header:** Back arrow + "Weight History"

**Month groups:**
- Month header: "March 2026" (uppercase label style)
- Entry rows in rounded container (1px outline-variant dividers):
  - 3-column grid: Date ("Mon 15") | Weight ("82.5kg", Manrope 700) | Change ("+0.3" red or "-0.2" green)
  - Optional notes row spanning full width (italic, muted)

**Load more button** at bottom (outline)

**Empty state:** History icon + "No weight entries yet"

---

### 4. Weight Settings (`/weight/settings`)

**Purpose:** Configure target weight and morning reminder

**Layout:** Single-column form with card sections

#### Structure:

**Header:** Back arrow + "Weight Settings"

**Goal Weight Card:**
- Section title "Goal weight" + hint "Set your target weight to track progress"
- Number input for target weight (kg)

**Morning Reminder Card:**
- Section title "Morning reminder" + hint "Get reminded to weigh in each morning"
- Time input for reminder time (defaults to 07:00)

**Actions:** "Cancel" (outline) + "Save" (primary)

---

### 5. Dashboard Weight Card (embedded in `/dashboard`)

**Purpose:** Quick weight status visible from the main dashboard — links to full weight page

**Layout:** Full-width card within the dashboard bento grid

#### Structure:
- Clickable card (cursor: pointer, hover state)
- Header: Monitor weight icon + "WEIGHT" label
- Body row:
  - Large current weight "82.5kg" (Manrope 800, 1.75rem)
  - Progress bar (6px height, cyan fill, surface background, rounded)
  - Label "67% to goal · 5.2kg to go"
  - Streak badge (tertiary variant, "12d streak")

---

## Interaction Design

### Transitions & Animation
| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Modal appearance | Slide up (mobile) / fade + scale (desktop) | 200ms | ease-out |
| Modal dismiss | Slide down / fade out | 150ms | ease-in |
| Progress ring fill | Stroke-dashoffset | 500ms | ease |
| Chart data line | Drawing from left to right | 300ms | ease-out |
| Range tab switch | Color + background transition | 200ms | ease |
| Milestone badge appear | Fade in + slight scale | 200ms | ease-out |
| Progress bar fill | Width transition | 500ms | ease |
| Weight save | Button loading spinner → check mark → dismiss | 300ms total | ease |

### States
| State | Behavior |
|-------|----------|
| Loading | Skeleton placeholders (pulse animation) matching card dimensions |
| Empty (no entries) | Centered icon + message + optional CTA |
| Empty (no goal) | Ring outline + flag icon + "Set a goal" |
| Empty (no prediction data) | Analytics icon + "Log meals for 3+ days..." |
| Prompt dismissed | Session-scoped — resets on next app open |
| Goal reached | Ring turns green, "100%" center text, "reached" label |

### Color-Coded Indicators
| Metric | Positive | Negative | Neutral |
|--------|----------|----------|---------|
| Weight change (loss goal) | Green `#22c55e` (down) | Red `--error` (up) | Muted `--on-surface-variant` |
| Weight change (gain goal) | Green (up) | Red (down) | Muted |
| Calorie surplus | Red | Green | Muted |
| Streak | Tertiary orange | — | — |
| Goal progress | Cyan → Green at 100% | — | Surface container |

---

## Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| < 768px (mobile) | Single-column cards, bottom sheet modal, bottom nav visible |
| 768px+ (tablet/desktop) | 2-column bento grid, centered dialog modal, side nav visible |

All cards stack single-column on mobile. The chart SVG scales naturally via `viewBox`. Touch targets remain 44px minimum.

---

## Accessibility

- All interactive elements: visible focus ring (2px outline, primary color, 2px offset)
- Chart: `role="img"` with `aria-label` describing the trend
- Form inputs: visible labels (never placeholder-only), proper `for` attributes
- Color is never the only indicator (arrows + color for direction, text + bar for progress)
- Keyboard navigable tab order matches visual order
- `prefers-reduced-motion`: Skip chart drawing animation, instant ring fill

---

## Data Flow Summary

```
User opens app
  └── Layout dispatches Weight.CheckToday
      └── todayEntry === null && !dismissed → show modal
          ├── User saves → Weight.LogWeight → Firestore → close modal
          └── User skips → Weight.DismissPrompt → close modal (session only)

User navigates to /weight
  └── WeightHome dispatches Weight.LoadHistory (90 entries)
      ├── Chart reads visibleEntries (filtered by viewRange)
      ├── Trend reads movingAverage7 (rolling avg from entries)
      ├── Goal ring reads ProfileState.goals.targetWeight + latest/start weight
      ├── Prediction reads EnergyState.dailySummary (calorie data)
      ├── Recap computed from entries (last 7 vs previous 7 days)
      └── Milestones computed from entries + streak + targetWeight
```
