# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two adults sharing a household (a couple, or any two people living together) who
want to track their shared and individual finances month by month without
spreadsheets or asking each other. Both use the app from their phones; one may
also use it from a laptop. No third user is expected — the app is deliberately
capped at two accounts.

## Product Purpose

Nest is a mobile-first PWA ("Tu espacio financiero compartido") that answers,
at month end, four questions: how much each person contributed to the shared pot,
how much of it is gone, how much is left to spend, and what each person spent on
their own. It covers salaries, a single shared contribution percentage, a monthly
budget cap, shared and private expenses, recurring expenses, annual payment
reminders, and a grace-window for editing past months. Success means both people
can close the month with matching numbers and no ambiguity about who paid what.

## Positioning

One shared month and one shared percentage feed the joint account, while each
person keeps a private area with their own budget and expenses. The two views are
not two apps: they share the same month, the same salaries and the same
navigation, and differ only in whose data you see. Money is stored in integer
cents so the arithmetic is exact, and the rules (grace window, immutability of
fixed figures, max two users) are enforced server-side and in the database, not
just hidden in the UI.

## Operating Context

- Monthly cycle: a new month is created automatically on day 1, carrying over
  recurring expenses from the previous month.
- Grace window for edits: the current month is fully editable; last month is
  editable until day 5 inclusive and then only accepts new entries; older months
  are read-only.
- Fixed figures (salary, shared percentage, budget) are written once and then
  immutable.
- Annual payments (insurance, taxes, subscriptions) are kept as reminders that
  surface in their month; the real expense is recorded manually with that year's
  amount.
- Two areas (joint `/conjunta/...` and individual `/individual/...`) selected from
  a chooser screen after login.

## Capabilities and Constraints

- Maximum two user accounts, enforced by a database trigger.
- Single currency: euro, stored as integer cents (`bigint`); only the percentage
  is decimal.
- Interface language: Spanish; copy centralized in `src/literals/` and kept neutral
  (no "pareja"-specific wording) to allow future evolution.
- Mobile-first, 390–430 px base width; PWA with manifest and iOS splash screens.
- Owner is always derived from the session; client-supplied ids are rejected.
- All user-facing text and validation messages live in `src/literals/`.
- Environment access only through `src/infrastructure/config.ts` (Zod-validated).
- Development and production share one Supabase instance while in testing.

## Brand Commitments

- Product name: **Nest** ("Tu espacio financiero compartido").
- Neutral, non-gendered copy; no anchoring to the concept of "pareja".
- Design tokens defined in `src/app/globals.css` via Tailwind v4 `@theme`
  (brand navy/primary/sky/pale/bg/surface/ink/muted/border; financial
  positive/negative/amber reserved strictly for financial meaning).
- Monospaced typography (`font-mono`) for all monetary figures.
- Rounded cards (`rounded-2xl`/`rounded-3xl`), bottom navigation bar with 4 items.

## Evidence on Hand

- Design mockups: `docs/mockups/screen_*.png` (5 screens).
- Functional specification: `docs/spec.md`.
- Security posture and accepted debt: `docs/security.md`.
- Development guide: `AGENTS.md`; contribution guide: `CONTRIBUTING.md`.

## Product Principles

1. Numbers must reconcile: every screen derives from the same pure rules, so the
   joint and individual areas can never disagree silently.
2. Immutability is a guarantee, not a suggestion: fixed figures are enforced
   server-side.
3. Exactness over convenience: money is integer cents, never floats.
4. Mobile-first and offline-capable: the common case is a phone, possibly
   without connectivity.
5. Neutral language: the UI never assumes who the two users are.

## Accessibility & Inclusion

No product-specific accessibility standard has been declared yet; baseline
expectations apply (keyboard navigation, sufficient contrast, semantic HTML, and
respect for `prefers-reduced-motion`).
