# Insights Feature — AI Design Prompt

Use this prompt with an AI design tool (v0, Galileo, etc.) to generate the UI design for the Hardline Insights page.

---

## Prompt

Design a single scrollable **Insights** page for a mobile-first dark-themed gym tracker called **Hardline**. This page lives at `/insights` in the main app navigation alongside Dashboard, Workouts, Energy, and Weight. It is a data-rich overview of the user's training and nutrition — no AI, no chat, just well-visualized data that helps gym-goers understand their progress, recovery, and balance at a glance.

The page is long but should feel like a curated feed, not a spreadsheet. Each insight is a self-contained card. The user scrolls through them naturally. Design all 9 insight cards for a single continuous page.

### Design System

- **Theme**: Dark mode only
- **Background**: `#131313` (surface), `#0e0e0e` (lowest), `#1c1b1b` (low), `#201f1f` (container), `#2a2a2a` (high), `#353534` (highest)
- **Primary accent**: `#3cd7ff` (cyan), container: `#009ebe`
- **Secondary**: `#c8c6c5` (warm grey)
- **Tertiary/Warning**: `#ffb595` (warm orange), container: `#ef6719`
- **Error**: `#ffb4ab`
- **Success/Positive**: `#66d9a0` (green for positive deltas)
- **Text on surface**: `#e5e2e1`
- **Text on surface variant**: `#c1c6d7`
- **Outline**: `#8b90a0`, variant: `#414755`
- **Headline font**: Manrope (weights: 200, 400, 600, 800)
- **Body/Label font**: Inter (weights: 300, 400, 500, 600)
- **Corner radius**: small 8px, medium 12px, large 16px, extra-large 28px
- **Elevation**: surface tint `#3cd7ff` at low opacity for elevation layers
- **Icons**: Material Symbols Outlined (variable weight/fill)
- **Charts**: Use simple, clean chart styles — no gridlines, minimal axis labels, emphasis on the data shape. Chart colors should use the primary/tertiary palette.
- **Target device**: 375px width base, scaling up. Two-column grid on tablet (768px+).

---

## Page Structure

### Page Header
- Title: "Insights" (large, Manrope 800)
- Subtitle: "Your training at a glance" (small, dimmed)
- Optional: time range selector pill group — "This Week" / "This Month" / "3 Months" — affects data in cards 3, 5, 6, 7. Default: "This Month"

### Card Layout
On mobile (< 768px): single column, full-width cards, 12px gap between cards.
On tablet (768px+): two-column masonry grid. The Muscle Recovery Map and PR Board span full width. Smaller stat cards pair side by side.

---

## Card 1: Muscle Recovery Map (full-width, hero card)

The visual centerpiece of the page. Shows a simplified human body silhouette (front view and back view side by side) with major muscle groups as regions that light up based on recovery status.

**Muscle regions** (mapped to our MuscleGroup enum):
- Chest (front torso, upper)
- Back (rear torso)
- Shoulders (deltoid area, both views)
- Arms (biceps front, triceps back)
- Legs (quads front, hamstrings/glutes back)
- Core (front torso, lower/midsection)

**Color coding:**
- `#ef6719` (warm orange, pulsing glow) = Trained < 24h ago — "Recovering"
- `#ffb595` (light orange, solid) = Trained 24–48h ago — "Still sore"
- `#66d9a0` (green) = Trained 48–72h ago — "Ready to train"
- `#414755` (dark grey) = Not trained in 5+ days — "Undertrained"
- Untouched/no data = same dark grey but even dimmer

**Below the body:**
- Legend row: colored dots with labels (Recovering / Still sore / Ready / Undertrained)
- Compact list of muscle groups with last trained date: "Chest — 2 days ago", "Legs — 5 days ago" etc., sorted by staleness

**Design notes:**
- The silhouette should be stylized and minimal — not anatomically detailed. Think fitness app, not medical diagram. Clean outlines with filled color regions.
- Use a subtle glow/bloom effect on the orange "recovering" regions to draw the eye.
- The silhouette pair should be centered and take up roughly 200px height.
- This card has `elevation: 2` and a subtle top border accent in primary color.

---

## Card 2: PR Board — Big Lifts (full-width)

A horizontal scrollable row of PR cards for the user's major compound lifts. Each PR card is a compact vertical tile.

**Default lifts shown** (auto-detected from user's workout plans):
- Bench Press, Squat, Deadlift, Overhead Press, Barbell Row, Pull-ups
- Only show lifts the user has actually performed. If they've done 3, show 3.

**Each PR tile** (~140px wide, ~160px tall):
- Exercise name (truncated to 2 lines max, small bold text)
- Large 1RM number in cyan (e.g., "85kg") — Manrope 800, ~1.5rem
- Below: the set that achieved it — "70kg x 8" in dimmed text
- Date achieved — "Mar 12" in small caps
- Mini sparkline chart (last 8 data points of 1RM history) — thin cyan line, no axes, ~30px tall. Shows the trajectory at a glance.

**Design notes:**
- Horizontally scrollable on mobile with peek (show partial next card to hint scrollability)
- On tablet, can fit 4–5 tiles without scrolling
- Each tile is an elevated card (`surface-container-high` background)
- If a PR was achieved in the last 7 days, show a small trophy icon and a warm orange left border accent

---

## Card 3: Weekly Volume Trend (standard card)

A vertical bar chart showing total training volume (kg) per week.

**Chart:**
- X-axis: week labels ("W1", "W2", ... or "Feb 3", "Feb 10" for month view)
- Y-axis: implied by bar height, show value label on top of each bar
- Bars: cyan fill with slight border-radius on top
- Current week's bar: brighter cyan or outlined to distinguish "in progress"
- 8 bars for "This Month" range, 12 for "3 Months"

**Below chart:**
- Current week total: "This week: 12,400 kg" in bold
- Comparison: "+8% vs last week" in green or "−3%" in error color

**Design notes:**
- Chart height: ~140px
- Keep the chart clean — no gridlines, no y-axis labels. The bar height + top label is enough.

---

## Card 4: Strength Curves (standard card)

A line chart showing estimated 1RM progression for a selected exercise over time.

**Interaction:**
- Exercise selector at top of card: horizontally scrollable chips (same exercises as PR Board)
- Active chip is cyan, others are outline/ghost style
- Chart updates to show the selected exercise's 1RM history

**Chart:**
- X-axis: dates (last 8–12 sessions that included this exercise)
- Y-axis: estimated 1RM in kg
- Line: cyan, 2px, with dots on data points
- Most recent point: larger dot with value label ("85kg")
- Starting point: dimmed value label for comparison ("72kg")

**Below chart:**
- Total gain: "+13kg since first session" or "+18%" in green

**Design notes:**
- Chart height: ~120px
- If an exercise has < 3 data points, show a message: "Keep training — trends appear after 3 sessions"

---

## Card 5: Training Frequency Heatmap (standard card)

A GitHub-style contribution grid showing workout activity over the selected time range.

**Grid:**
- Columns = weeks, rows = days of week (Mon–Sun)
- Each cell is a small rounded square (~16px)
- Color intensity based on training volume that day:
  - No workout: `#1c1b1b` (barely visible)
  - Light session: `rgba(60, 215, 255, 0.2)`
  - Medium session: `rgba(60, 215, 255, 0.5)`
  - Heavy session: `rgba(60, 215, 255, 0.9)`
- Today's cell has a subtle border ring

**Below grid:**
- Stats row: "18 workouts" / "4.5 per week avg" / "Current streak: 3 days"
- Streak uses a small flame or lightning icon if active

**Design notes:**
- Day labels (M, T, W, T, F, S, S) on the left, very small
- Month labels on top if showing 3 months
- The grid naturally communicates consistency vs gaps — no explanation needed

---

## Card 6: Calories vs Weight (standard card)

A dual-visualization showing the relationship between calorie balance and body weight over time.

**Top half — Calorie balance bars:**
- Vertical bars, one per day (or averaged per week for 3-month view)
- Bars above zero line: surplus (dimmed cyan)
- Bars below zero line: deficit (dimmed orange)
- Zero line visible as a thin outline-variant horizontal rule

**Bottom half — Weight trend line:**
- Smooth line (moving average) in cyan
- Individual weigh-in dots in lighter color
- Y-axis: show start and current weight values only (e.g., "82.5" at left, "81.1" at right)

**Below chart:**
- "Avg daily balance: −320 kcal" and "Weight change: −1.4 kg" as stat pills

**Design notes:**
- Chart total height: ~160px (80px each half)
- The two charts should be vertically aligned so the user's eye connects "I ate less here → weight dropped here"
- If no weight data: show only the calorie balance half with a prompt "Log your weight to see the trend"

---

## Card 7: Protein Adherence (compact card)

A simple ring/donut chart with a score.

**Ring chart:**
- Single ring, cyan fill for adherent days, dark grey for missed days
- Center number: "5/7" (days hitting ≥ 90% protein target this week)
- Below ring: "Protein score" label

**Side stats** (to the right of the ring, or below on very narrow screens):
- "Avg intake: 142g / 150g target"
- "Best streak: 12 days"
- Current streak indicator

**Design notes:**
- This is a smaller card — ring chart ~100px diameter
- On tablet, this pairs side by side with the Muscle Group Balance card
- Green ring if ≥ 6/7, cyan if 4–5/7, orange if ≤ 3/7

---

## Card 8: Muscle Group Balance (compact card)

A radar/spider chart showing training volume distribution across muscle groups.

**Chart:**
- 6 axes: Chest, Back, Shoulders, Legs, Arms, Core
- Filled polygon showing the user's actual weekly set volume per group
- Faint outline polygon showing a "balanced" reference (equal volume)
- Fill color: cyan at 20% opacity, border: solid cyan
- Reference: outline-variant color, dashed

**Below chart:**
- Callout for the most neglected group: "Legs are 40% below your average — consider adding a leg day" in a subtle warning-toned text (not aggressive, just informative)

**Design notes:**
- Chart: ~160px square
- Axis labels positioned outside the chart (small text)
- On tablet, pairs with Protein Adherence card

---

## Card 9: Body Weight Momentum (compact card)

A single bold stat with context — the "am I on track?" answer.

**Main stat:**
- Rate of change: "−0.3 kg/week" — large Manrope 800 text
- Color: green if aligned with goal (cutting and losing, or bulking and gaining), cyan if maintaining, orange if going the wrong direction

**Context label** below:
- Based on user's `fitnessGoal`:
  - Cutting: "On track for your cut" / "Weight loss has stalled" / "Gaining — check your intake"
  - Maintaining: "Holding steady" / "Drifting up" / "Drifting down"
  - Bulking: "Gaining at a good pace" / "Gaining too fast" / "Not gaining — eat more"

**Supporting detail:**
- "Based on last 4 weeks" label
- Mini sparkline of weekly average weight (tiny, ~20px tall, just shows direction)

**Design notes:**
- Compact card, similar height to Protein Adherence
- The text label is the key value — make it feel like a coach's one-liner, not a data readout
- On tablet, this can be a third small card in a row with cards 7 and 8

---

## Empty/Insufficient Data States

Design a consistent empty state for cards that don't have enough data yet:

- Dimmed version of the card with the chart area replaced by a centered message
- Icon: `insights` or `trending_up` (material symbol, dimmed)
- Text: "Complete 3 workouts to unlock this insight" or "Log your meals to see nutrition trends"
- Style: same card frame, but interior is `surface-container` with 50% opacity content

---

## Design Principles

- **Scannable feed**: Each card should communicate its key insight in under 2 seconds of looking. Big number or clear visual shape first, details second.
- **No interaction required**: Everything is visible on scroll. No tabs within cards (except the exercise selector on Strength Curves). No expand/collapse.
- **Dark-on-dark depth**: Cards at `surface-container-high`, page background at `surface`. Charts use transparency and the cyan/orange palette on dark backgrounds.
- **Consistent card anatomy**: Every card has — section title (small caps, primary color), main visualization, and 1–2 supporting stats below. Manrope for numbers, Inter for labels.
- **Mobile-first scroll**: On 375px, the page is a single column feed. Cards have 12px vertical gap. Total page length for a fully-populated insights page should be roughly 5–6 screen heights.
- **Celebratory accents**: PRs get orange. Positive trends get green. The recovery map gets the glow effect. These small moments of color make the page feel alive without being noisy.
- **Typography**: Chart values and big stats use Manrope 800 in cyan or white. Labels and descriptions use Inter 400–500 in `on-surface-variant`. Section titles use Inter 600 in primary, uppercase, letterspaced.

---

## Data Sources (for implementation reference)

| Card | Primary Data |
|------|-------------|
| Recovery Map | `WorkoutSession` timestamps + `Exercise.muscleGroup` |
| PR Board | `PersonalRecord` collection |
| Volume Trend | `SessionSet.weight * actualReps` per week |
| Strength Curves | Best `SessionSet` per exercise per session → 1RM estimate |
| Training Heatmap | `WorkoutSession.startedAt` dates + volume |
| Calories vs Weight | `DailySummary.netCalories` + weight records |
| Protein Adherence | `WeeklySummary.proteinAdherence` or daily protein vs target |
| Muscle Balance | Completed sets per `MuscleGroup` per week |
| Weight Momentum | Weight history smoothed over 4-week window + `UserGoals.fitnessGoal` |
