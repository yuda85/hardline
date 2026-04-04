# Energy Feature — Professional Design Prompt

## Overview

Design the **Energy tracking feature** for Hardline, a dark-themed mobile-first fitness app. Energy is the nutrition pillar — it tracks calorie intake (meals), calorie burn (BMR, steps, workouts, cardio), macro nutrients, and provides daily/weekly summaries with deficit/surplus analysis.

The feature has 6 screens + 3 shared visualization components + 2 modal flows (meal logging + AI meal analysis).

---

## Brand & Design System

### Identity
- **App name:** Hardline
- **Personality:** Clean, data-driven, motivating but not gimmicky. Premium dark fitness aesthetic.
- **Target user:** Health-conscious adults tracking nutrition alongside training and body composition

### Color Palette (MD3 Dark Theme)
| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` / `primary-container` | `#3cd7ff` | Accent, calorie ring, protein bars, deficit indicator, active states |
| `--tertiary` / `tertiary-container` | `#ffb595` / `#ef6719` | Carbs macro bar, surplus indicator, cardio badges |
| `--secondary` | `#c8c6c5` | Fat macro bar |
| `--error` | `#ffb4ab` | Over-target calorie ring, error states |
| `--surface` | `#131313` | Page background |
| `--surface-container-low` | `#1c1b1b` | Card backgrounds (low elevation) |
| `--surface-container` | `#201f1f` | Card backgrounds (default) |
| `--surface-container-high` | `#2a2a2a` | Input backgrounds, macro bar tracks, elevated elements |
| `--surface-container-highest` | `#353534` | Toggle backgrounds, highest elevation |
| `--on-surface` | `#e5e2e1` | Primary text |
| `--on-surface-variant` | `#c1c6d7` | Secondary/muted text, labels |
| `--outline-variant` | `#414755` | Borders, dividers |
| Success green | `#22c55e` | Positive adherence indicators |

### Typography
| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Headline | **Manrope** | 800 | Page titles, large stat values, calorie numbers |
| Headline Secondary | **Manrope** | 700 | Section titles, card headers |
| Body | **Inter** | 400–500 | Body text, food names, descriptions |
| Label | **Inter** | 600 | Uppercase labels, macro labels, badge text |

### Type Scale
- Page title: `clamp(1.5rem, 4vw, 2rem)` — Manrope 800
- Section title: `0.8125rem` — Manrope 700
- Large stat value: `1.75rem` — Manrope 800
- Medium stat value: `1.375rem` — Manrope 800
- Body: `0.875rem` — Inter 400
- Label (uppercase): `0.6875rem` — Inter 600, `letter-spacing: 0.03–0.05em`
- Micro label: `0.625rem` (10px) — Inter 700, `letter-spacing: 0.15em`
- Caption: `0.75rem` — Inter 400

### Iconography (Material Symbols Outlined)
- `bolt` — Energy nav item
- `restaurant` — Meals, food log
- `local_fire_department` — Calories burned, burn section
- `directions_walk` — Steps
- `exercise` — Workouts
- `directions_run` — Cardio
- `trending_down` / `trending_up` — Deficit/surplus
- `neurology` — AI meal analysis
- `fact_check` — AI analysis results
- `tune` / `settings` — Goals setup
- `calendar_month` — Weekly summary
- `add` — Add items
- `delete` — Remove items
- `chevron_left` / `chevron_right` — Date navigation

### Spacing & Layout
- **Border radius:** `0.75rem` (cards), `0.5rem` (inputs), `1.5rem` (large cards/bento), `9999px` (pills)
- **Min touch target:** 44px
- **Card gap:** `0.75rem`–`1.5rem`
- **Content max-width:** `640px` (mobile-first) — expand to bento grid on desktop
- **Safe area insets:** Respected for notched devices

### Effects
- **Technical glow:** `box-shadow: 0 0 40px -10px rgba(60, 215, 255, 0.15)`
- **Hover glow:** Gradient blur behind cards on hover
- **Background blur orbs:** Subtle cyan/tertiary decorative elements
- **Transitions:** `200ms ease` for interactions, `400-500ms ease` for progress animations
- **Reduced motion:** Respect `prefers-reduced-motion`

---

## Screens

### 1. Energy Home (`/energy`)

**Purpose:** Main energy dashboard — calorie ring, macros, burn stats, quick actions. The at-a-glance view of today's nutrition.

**Current structure:**
- Header: "Energy Balance" + settings gear
- Setup prompt (if no goals configured)
- Calorie ring (lg) + macro bars in a wide card
- Net balance card (deficit/surplus with color coding)
- 2×2 stat cards: steps, calories burned, meals logged, weekly link
- Quick action buttons: "Log meal" + "Log activity"

**Data available:**
- GoalSettings: dailyCalories, dailyProtein, dailyCarbs, dailyFat, bmr, tdee
- DailySummary: consumedCalories, consumedProtein/Carbs/Fat, mealCount, totalCaloriesOut, netCalories, deficitOrSurplus, steps, stepsCalories, workoutCalories, cardioCalories
- DailySteps: steps count

**Design direction:** Transform into the same premium bento grid style as the Weight feature — hero calorie card, editorial typography, gradient accents, technical glow effects.

---

### 2. Goals Setup (`/energy/goals`)

**Purpose:** Configure all nutrition targets — body stats, fitness goal, activity level, macro split. Includes live BMR/TDEE/calorie preview.

**Current structure:**
- Header: "Goals & Targets" + save button
- Form sections in cards:
  1. Body stats (2×2 grid): age, sex, height, weight
  2. Fitness goal toggle: Cutting / Maintaining / Bulking
  3. Rate of change toggle (conditional): Slow / Moderate / Aggressive
  4. Activity level dropdown + workouts/week + steps target
  5. Macro preset toggles: Balanced / High Protein / Low Carb / Custom
- Live preview card (highlighted):
  - BMR | TDEE | Daily Target (3 columns)
  - Macro bars with gram values

**Data:**
- Form fields: age, sex, heightCm, weightKg, fitnessGoal, rateOfChange, activityLevel, weeklyWorkouts, dailyStepsTarget, macroPreference
- Live calculation: BMR (Mifflin-St Jeor) → TDEE (activity multiplier) → calorie target (goal adjustment) → macro split (preset ratios)

**Design direction:** Editorial settings page similar to Weight Settings — ghost watermark text, border-left accent cards, gradient save button, premium input styling.

---

### 3. Food Log (`/energy/food`)

**Purpose:** View all meals for a day, organized by type (breakfast/lunch/dinner/snack). Log new meals manually or via AI.

**Current structure:**
- Header: "Food Log" + "Log meal" button
- Date navigation arrows + formatted date
- Calorie summary: small ring + consumed/target text
- Macro bars (full width)
- AI meal input component (text description → AI analysis)
- Meal sections by type (breakfast, lunch, dinner, snack):
  - Section header: type name + total kcal
  - Meal cards: food names, timestamp, source badge, macros (P/C/F), kcal, delete button
  - Empty state per type

**Data per meal:**
- items[]: name, calories, protein, carbs, fat, quantity, unit
- mealType, source (manual/ai_text/ai_image), confidence, timestamp
- totals: totalCalories, totalProtein, totalCarbs, totalFat

**Design direction:** Premium card-based meal timeline, editorial date navigation, AI input as a prominent feature card.

---

### 4. Add Meal Modal (overlay)

**Purpose:** Manual meal entry form with multiple food items per meal.

**Current structure:**
- Bottom sheet (mobile) / centered dialog (desktop)
- Meal type tabs: Breakfast | Lunch | Dinner | Snack
- FormArray of items, each with: name, calories, protein, carbs, fat
- Add item button (dashed border)
- Cancel + Save actions

**Design direction:** Same bottom sheet style as Weight Entry Modal — drag handle, icon box header, editorial labels, gradient save button.

---

### 5. AI Meal Input (inline component on Food Log)

**Purpose:** Describe food in natural language, AI parses into structured meal items with macros.

**Current structure:**
- Textarea with neurology icon + "Analyze" button
- Error state
- Preview card showing AI-parsed items:
  - Item list with per-item macros
  - Total calories
  - Meal type selection
  - Confirm/cancel actions

**Design direction:** Premium AI card with glow effects, structured analysis preview.

---

### 6. Activity & Burn (`/energy/activity`)

**Purpose:** Track steps, view workout burns, log cardio activities.

**Current structure:**
- Burn breakdown card (4-column grid): BMR | Steps | Workouts | Cardio → Total
- Steps card: large input + target + save button
- Workout sessions list (auto-populated from training)
- Cardio section: entries list + add form (collapsible)
  - Cardio form: type dropdown, duration, calories, distance (optional)

**Data:**
- DailySteps, CardioEntry[], WorkoutSession[]
- GoalSettings: bmr, dailyStepsTarget
- DailySummary: stepsCalories, workoutCalories, cardioCalories, totalCaloriesOut

**Design direction:** Bento grid layout, border-left accent cards, editorial section headers.

---

### 7. Daily Summary (`/energy/daily`)

**Purpose:** Detailed breakdown of a single day — intake vs. burn, net balance, macros.

**Current structure:**
- Date navigation (chevrons + formatted date)
- Intake card: calorie ring + macro bars + meal count
- Burn card: BMR/steps/workouts/cardio breakdown → total
- Balance card (deficit/surplus)
- Weight display (if logged)

**Design direction:** Premium summary cards with editorial stat presentation.

---

### 8. Weekly Summary (`/energy/weekly`)

**Purpose:** 7-day trends — average intake, burn, adherence metrics, weight change.

**Current structure:**
- Week navigation (prev/next + date range display)
- 2×2 stat grid: avg intake, avg burned, avg net balance, avg protein
- Adherence card: protein %, workouts completed, avg steps, cardio sessions
- Weight change (if tracked): start → end weight with badge

**Data (WeeklySummary):**
- avgCalorieIntake, avgCaloriesBurned, avgNetBalance, avgProtein
- proteinAdherence (%), workoutsCompleted/target, avgSteps, cardioSessions
- startWeight, endWeight, weightChange

**Design direction:** Dashboard-style analytics with trend indicators.

---

## Shared Visualization Components

### Calorie Ring (SVG)
- **Input:** consumed, target, burned, size (sm/md/lg)
- **Visual:** Circular SVG ring showing calories remaining/over
- **States:** Under target (cyan fill) / over target (red fill)
- **Sizes:** sm=72px, md=100px, lg=140px
- **Animation:** 500ms stroke-dashoffset transition

### Macro Bars
- **Input:** protein/carbs/fat current and goal values
- **Visual:** Three horizontal progress bars
- **Colors:** Protein=cyan(primary), Carbs=orange(tertiary), Fat=gray(secondary)
- **Animation:** 400ms width transition

### Balance Card
- **Input:** consumed calories, burned calories
- **Visual:** Color-coded card — blue for deficit, orange for surplus
- **Content:** Net value + In/Out breakdown + trending icon

---

## Interaction Patterns

### Date Navigation
Used on Food Log, Daily Summary, Weekly Summary:
- Left/right chevron buttons
- Current date/week displayed between
- Tapping chevrons shifts by 1 day (or 1 week)

### Modal/Sheet Pattern
Used by Add Meal and AI Meal Input:
- Mobile: bottom sheet with drag handle, rounded top corners
- Desktop: centered dialog with blur backdrop
- Gradient primary action button, text-only secondary action

### Toggle Groups
Used in Goals Setup:
- Pill-shaped buttons in a row
- Active state: primary bg + dark text
- Inactive state: surface bg + muted text

---

## Data Flow Summary

```
User opens /energy
  └── EnergyHome dispatches LoadGoalSettings + FetchDayData(today)
      ├── Calorie ring reads dailySummary.consumedCalories vs goalSettings.dailyCalories
      ├── Macro bars read consumed vs goal protein/carbs/fat
      ├── Balance card reads consumed vs totalCaloriesOut
      └── Stat cards read steps, mealCount, totalCaloriesOut

User navigates to /energy/food
  └── FoodLog reads todaysMeals (grouped by mealType)
      ├── AI input calls AIService.parseTextToMeal()
      ├── Manual entry dispatches Energy.AddMeal
      └── Both trigger RecalculateDailySummary

User navigates to /energy/activity
  └── Activity reads cardio, steps, workout sessions
      ├── Steps update dispatches Energy.UpdateSteps → RecalculateDailySummary
      ├── Cardio add dispatches Energy.AddCardio → RecalculateDailySummary
      └── Burn breakdown computed from DailySummary

User navigates to /energy/daily
  └── DailySummary shows full day breakdown
      └── Date nav dispatches Energy.FetchDayData(date)

User navigates to /energy/weekly
  └── WeeklySummary dispatches FetchWeeklySummary(weekStart)
      └── Week nav recalculates via RecalculateWeeklySummary

User navigates to /energy/goals
  └── GoalsSetup reads/saves GoalSettings
      └── Live preview recalculates BMR → TDEE → calories → macros
```

---

## Accessibility

- All interactive elements: visible focus ring (2px outline, primary, 2px offset)
- Form inputs: visible labels (never placeholder-only), proper `for` attributes
- Calorie ring: `role="img"` with descriptive `aria-label`
- Color is never the only indicator (text labels accompany all color-coded values)
- Date navigation: aria-labels on chevron buttons
- Modal: focus trap, ESC to close, backdrop click to dismiss
- `prefers-reduced-motion`: Skip ring/bar animations

---

## Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| < 480px | Single column, stacked layout, bottom sheet modals |
| 480–767px | 2-column grids where applicable |
| 768px+ | Bento grid (4-col or 12-col), centered dialog modals |

All pages use `max-width: 640px` on mobile. Expand to wider bento grids on tablet/desktop.

---

## Current Components Inventory

| Component | Path | Purpose |
|-----------|------|---------|
| EnergyHomeComponent | `features/energy/energy-home/` | Main dashboard |
| GoalsSetupComponent | `features/energy/goals-setup/` | Goal configuration |
| FoodLogComponent | `features/energy/food-log/` | Meal list + AI input |
| AddMealEnergyComponent | `features/energy/add-meal/` | Manual meal entry modal |
| AIMealInputEnergyComponent | `features/energy/ai-meal-input/` | AI text → meal parser |
| ActivityComponent | `features/energy/activity/` | Steps + cardio + burn |
| DailySummaryComponent | `features/energy/daily-summary/` | Day detail view |
| WeeklySummaryComponent | `features/energy/weekly-summary/` | Week overview |
| CalorieRingComponent | `features/energy/shared/calorie-ring/` | SVG progress ring |
| MacroBarsComponent | `features/energy/shared/macro-bars/` | Macro progress bars |
| BalanceCardComponent | `features/energy/shared/balance-card/` | Deficit/surplus card |
