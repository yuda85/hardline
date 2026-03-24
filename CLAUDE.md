# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `npm start` (serves at http://localhost:4200, auto-reloads)
- **Build:** `npm run build` (production by default, outputs to `dist/`)
- **Run all tests:** `npm test` (Vitest via Angular CLI)
- **Run a single test file:** `npx ng test --include src/app/app.spec.ts`
- **Scaffold component:** `npx ng generate component component-name`
- **Format:** Prettier is configured (`.prettierrc`) — 100 char width, single quotes, Angular HTML parser

## Architecture

- **Angular 21** standalone application (no NgModules) with **Vitest** for unit testing
- Entry point: `src/main.ts` bootstraps `App` component with config from `src/app/app.config.ts`
- Routing defined in `src/app/app.routes.ts`, provided via `provideRouter()` in app config
- Components use standalone `imports` array (no shared module pattern)
- Styles: SCSS (both global `src/styles.scss` and per-component)
- Static assets served from `public/`

## TypeScript

- Strict mode enabled with additional Angular strictness (`strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`)
- Target: ES2022, module: preserve
- Test files use `vitest/globals` types (describe/it/expect available globally)
- Test files follow `*.spec.ts` co-located naming convention

## State Management (NGXS)

NGXS is used for **important cross-component global state only**. Do NOT put everything in the store.

### USE NGXS for:
- Auth state (current user, authentication status, initialization flag)
- User profile and goals (referenced by dashboard, nutrition, workout features)
- Active workout session (critical cross-component state during a workout)
- Daily nutrition data (today's meals and macro totals, shared by dashboard + nutrition)

### DO NOT use NGXS for:
- **Form state** — use Angular Reactive Forms (`FormGroup`, `FormControl`)
- **UI toggles** scoped to one component (sidebar open, dropdown visible) — use signals
- **Search/filter** state local to a page — use component signals
- **One-off data fetches** that only one component consumes — use the repository directly
- **Derived/computed values** that can be calculated from existing state — use NGXS selectors, not extra state

### Store Structure
```
src/app/store/
  auth/       — auth.state.ts, auth.actions.ts, auth.model.ts
  profile/    — profile.state.ts, profile.actions.ts, profile.model.ts
  nutrition/  — nutrition.state.ts, nutrition.actions.ts, nutrition.model.ts
  workout/    — workout.state.ts, workout.actions.ts, workout.model.ts
```

### Conventions
- Action classes use **namespace pattern**: `Auth.Login`, `Nutrition.AddMeal`
- Action type strings use **[Feature] Description** format: `'[Auth] Login With Google'`
- State classes use `@Selector()` decorator for derived data
- State handlers inject repositories for Firestore I/O
- State handlers return `Observable` or `void` (NGXS handles subscription)

## Data Layer

Firebase abstraction lives in `src/app/data/repositories/`. Each repository extends `BaseRepository<T>`:
- Never call Firestore directly from components or state handlers
- Repositories return `Observable<T>` for reads (real-time) and `Promise` for writes
- State handlers orchestrate repository calls

## Shared Components

Reusable UI components live in `src/app/shared/components/`. All are standalone.
- Components are **dumb** (presentational only) — no service injection, no store access
- Use Angular signals for inputs: `input<T>()`, `input.required<T>()`
- Follow the design system tokens from `styles.scss`
- Mobile-first: design for 375px, enhance upward
- Barrel export: `import { ButtonComponent } from '@shared/components'`
