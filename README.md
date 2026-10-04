<p align="center">
  <a href="https://github.com/andrwdnc/not_problems_app/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/andrwdnc/not_problems_app/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <img alt="TypeScript strict" src="https://img.shields.io/badge/TypeScript-strict-3178C6">
  <img alt="Tests 409" src="https://img.shields.io/badge/tests-409%20passing-1F9E6D">
  <img alt="Node 24" src="https://img.shields.io/badge/node-24.x-5FA04E">
  <img alt="Next.js 14.2.35" src="https://img.shields.io/badge/Next.js-14.2.35-000000">
</p>

> **After renaming the repository** to `nest-shared-finance`, update the badge
> URLs and the clone command above. GitHub redirects the old URLs, but image URLs
> do not redirect.

# Nest — shared finances for two people

A mobile-first PWA for splitting a monthly budget between two people. Two
separate areas over one database and one shared month: a **joint account** and a
**private account** per person.

> **Status:** in testing. The joint account is stable and in daily use; the
> individual area is complete but has only been exercised by the author. See
> [Known limitations](#known-limitations).

<p align="center">
  <img src="docs/mockups/screen_1_inicio.png" width="180" alt="Home screen with the progress ring and the three summary cards">
  <img src="docs/mockups/screen_3_gastos.png" width="180" alt="Expense list filtered by category">
  <img src="docs/mockups/screen_2_aportaciones.png" width="180" alt="Salary, shared percentage and budget form">
</p>

<!--
Design mockups from the functional spec, not screenshots of the running app.
Replace `docs/screens/` with real captures before using this repo in a portfolio:
I cannot produce screenshots from the app, and mockups in a public README are
the kind of shortcut a reviewer spots immediately.
-->

---

## What it does

Two people share a home. Money comes in from two salaries and goes out through a
monthly budget. The hard part is not storing the transactions — it is **answering
the questions that come up at month end**:

- How much did each of us actually put into the shared pot?
- How much of it is gone, and how much is left?
- What can we still spend before the month ends?
- What did I spend on my own, without having to ask anyone?

| | Joint account | Individual account |
|---|---|---|
| Salaries | Both people, from a single salary input | Yours only |
| Shared percentage | One value for the whole month, applied to both | Shown as `100 − shared` |
| Budget | One cap for the pair | Your own cap, per person |
| Expenses | Shared, visible to both | Private, visible only to you |
| Accrual | Fixed monthly expenses (rent, insurance) | The same, per person |
| History | Closed months, editable within a grace window | Your own history |

Both areas share the same month, the same salary figures and the same navigation.
Only the URL prefix and whose data you see change.

---

## Features

- **Progress ring** — percentage of the budget consumed, with the remaining
  amount as the headline figure.
- **Three summary cards** — contributed / spent / available, with monospaced
  figures so columns align and the numbers are auditable.
- **Grace window on edits** — the current month is fully editable; last month is
  editable until day 5 inclusive and then only accepts new entries; anything older
  is read-only. Declared as a rule table, not as nested `if`s.
- **Fixed monthly expenses with accrual** — one annual amount is spread across
  months, with the remainder distributed one cent at a time so the monthly shares
  add up to the annual total *exactly*. Marking it paid rolls it to the next cycle.
- **Budget vs. actual** — the monthly cap drives the ring, the percentage and the
  remaining amount. It deliberately does **not** rewrite "spent" or "savings".
- **Full audit trail** — every create, edit and delete writes the previous and
  new value, with the actor and the timestamp.
- **Immutable financial figures** — a salary, the shared percentage and a budget
  are written once. The lock is enforced server-side, not by hiding the button.
- **PWA** — installable, with an app manifest, iOS splash screens per device and
  safe-area handling for standalone launch.
- **Private by construction** — the owner is derived from the session, never from
  the request payload.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2.35 (App Router) — React Server Components + Server Actions |
| Language | TypeScript 5.4, `strict` + `noImplicitAny` |
| Runtime | Node.js `24.x` (pinned exactly) |
| Database | Supabase (PostgreSQL) |
| ORM | Drizzle ORM 0.45 |
| Auth | Bespoke — bcrypt + HTTP-only cookie signed with HMAC-SHA256 |
| Validation | Zod |
| Styling | Tailwind CSS v4 (design tokens via `@theme`, no `tailwind.config.ts`) |
| Icons | Lucide React |
| Tests | Vitest — 409 unit tests across 36 files |

---

## Architecture

Clean Architecture, with the dependency direction pointing inwards.

```
                 ┌─────────────────────────────────────────┐
   Browser ────▶ │ app/            routes, layouts, RSC    │  presentation
                 │ components/     render + events only     │
                 └───────────────────────┬─────────────────┘
                                         │  calls
                 ┌───────────────────────▼─────────────────┐
                 │ server-actions/   use cases + Zod       │  application
                 │                   queries + validation  │
                 └───────┬───────────────────────┬─────────┘
                         │ uses                  │ implements
                 ┌───────▼─────────┐    ┌────────▼────────────────────┐
                 │ domain/         │◀───│ infrastructure/            │  domain
                 │  rules          │    │  repositories (Drizzle)    │
                 │  value-objects  │    │  db, config, audit         │
                 │  ports          │    └─────────────────────────────┘
                 │  (interfaces)   │
                 └─────────────────┘
```

`domain/` imports nothing from Next.js, Drizzle or the database. It declares its
own persistence contracts in `ports/repositories.ts`, and `infrastructure/`
implements them — so a Drizzle repository can be swapped for a mock without
touching a single use case.

```
src/
├── app/                        # Routes. (auth), (dashboard), individual/
├── components/
│   ├── ui/                     # Button, Card, Input, Badge, Chip, Spinner
│   ├── features/               # Components bound to use cases
│   └── layout/                 # BottomNav, NavigationShell, LogoutButton
├── domain/                     # Pure business logic. No Next, no Drizzle.
│   ├── entities/               # Canonical domain types
│   ├── ports/                  # Persistence contracts (interfaces)
│   ├── rules/                  # Calculators, permission windows (+ tests)
│   └── value-objects/          # ImporteMoneda, Porcentaje, Categoria
├── infrastructure/
│   ├── db/                     # Drizzle schema, lazy connection
│   ├── repositories/           # Implementations of the domain ports
│   ├── audit/                  # auditarMovimiento(...)
│   └── config.ts               # Env validated with Zod
├── server-actions/             # Use cases and queries (+ tests)
├── server/auth/                # getCurrentUser, getCurrentUserId
├── literals/                   # Every user-facing string
├── lib/                        # Session, formatters, navigation
└── middleware.ts               # Route protection (Edge / Web Crypto)
```

**No API routes.** Every read is a Server Component and every write is a Server
Action. There is no second contract to keep in sync.

---

## Design decisions

The interesting part of this repo is not the screens, it is the reasoning.

**Money is stored as integer cents (`bigint`), never as `float` or `numeric`.**
The only decimal column in the schema is the percentage. Floating point on
currency is not a rounding annoyance, it is a class of bug that appears once a
month and is impossible to reproduce.

**Rules with states are tables, not conditionals.** `VentanaEdicionGastos`
decides what a month allows with a `REGLAS` table and a `PERMISOS` table. Adding
a state — "new entries allowed until day 10" — means adding a row, not
restructuring the function. Same for the auth rate limits
(`LimiteIntentosAuth`).

**One component, two account areas.** When the two areas had their own
components (`AportarForm` *and* `IndividualGastosList`), they silently drifted: a
bug fixed in one left the other broken, and nothing failed. The components are now
shared and parameterised by account variant, and `arquitectura.test.ts` is a guard
that fails the build if a component that serves only one area reappears.

**Immutability is enforced on the server, not hidden in the UI.** A fixed salary
cannot be edited because the write is conditional (`ON CONFLICT DO NOTHING`) and
returns null, not because the button is disabled. A disabled button is a
suggestion; a conditional write is a guarantee.

**Auth is bespoke, on purpose.** Auth.js or Supabase Auth would both work. The
bespoke option is ~90 lines of Web Crypto shared between Node and the Edge
middleware, and it exists because the session format had to be identical in both
runtimes — an earlier version recomputed the HMAC separately in each, which could
diverge silently. The trade-off is real and documented in
[`docs/security.md`](docs/security.md#4-deuda-aceptada-a-propósito): a stateless
session cannot be revoked remotely. That is acceptable for two people who trust
each other and stops being acceptable the moment a third user exists.

**Security fixes that a static review finds in five minutes.** The login path was
enumeration-safe by message but not by timing: it returned before `bcrypt.compare`
when the user did not exist, so a missing username answered in microseconds and an
existing one in ~100 ms. It now always compares, substituting a decoy hash. The
"maximum 2 users" rule was a `count()` in the application — a TOCTOU race that two
simultaneous signups could win, leaving three accounts — and is now a database
trigger that checks and allows the insert in the same transaction. The reasoning
for each is in [`docs/security.md`](docs/security.md).

**All user-facing text lives in `src/literals/`.** No hardcoded copy in
components, including validation messages and accessibility labels. It keeps the
UI copy editable in one place and removes the string churn from component reviews.

---

## Testing

```bash
npm test          # 409 tests, 36 files, ~2s
npm run test:watch
```

Tests live next to the code they cover (`*.test.ts`). No mocks of the database, no
testcontainers, no fixtures directory: the rules that matter are pure functions,
so the test suite runs anywhere in about two seconds.

| Area | What is covered |
|---|---|
| Money arithmetic | `CalculadoraAportacion`, `CalculadoraGastoAnual` (including the one-cent remainder distribution), `CalculadoraIndividual` |
| Permission windows | `VentanaEdicionGastos` — grace window, frozen months, future-dated expenses |
| Value objects | `ImporteMoneda`, `Porcentaje`, `Categoria` |
| Auth | Token signing and verification, constant-cost login, rate-limit policy, SQLSTATE translation |
| Server actions | Schema validation, owner isolation, revalidation, error mapping |
| Components | Shared summary blocks, expense rows, forms, history cards |
| **Architecture** | A guard that fails if an area-specific component reappears; a parity test between the two account areas |

The domain rules are mandatory coverage by policy, because they contain the money
arithmetic and the permission logic. If a change touches `src/domain/**` without a
test, the PR template says so.

---

## Getting started

Requirements: **Node.js 24.x** (pinned exactly — see below) and a PostgreSQL
database.

```bash
git clone https://github.com/andrwdnc/not_problems_app.git
cd not_problems_app
npm install

cp .env.example .env.local    # fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm run db:push               # apply the schema
npm run dev                   # http://localhost:3000
```

Generate the session secret with:

```bash
openssl rand -base64 48
```

`DATABASE_URL`, `DIRECT_URL` and `AUTH_SECRET` are the only variables required.
The app registers at most two accounts, which is a business rule enforced by a
database trigger.

### Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run db:generate` | Generate SQL migrations from the schema |
| `npm run db:push` | Apply the schema |
| `npm run db:migrate` | Apply generated migrations |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:migrate:auth-seguridad` | Rate-limit table + max-2-users trigger |

CI runs `typecheck`, `lint`, `test` and `build` on every push and pull request
against `develop` and `master`.

### Troubleshooting

If every screen except `/login` redirects back to `/login`, the database
credentials are wrong — it is almost never the network. The application reports
all connection failures with the same message, because they are indistinguishable
from the user's side. Three specific traps, in order of likelihood:

1. **The `aws-N` prefix is part of the DNS name.** Both `aws-0` and `aws-1` resolve,
   and the wrong one gets `tenant not found` from the Supavisor even though the
   project is alive.
2. **Port 6543 (transaction mode) is the one that authenticates.** Port 5432 can
   reject a correct password.
3. **Special characters in the password are percent-encoded** (`$` → `%24`).

Also, `db.<ref>.supabase.co` (the direct connection) is IPv6-only and unreachable
without global IPv6, in which case `DIRECT_URL` must point at the same URL as
`DATABASE_URL`. Passwords also expire: a panel showing
`postgresql://postgres:[YOUR-PASSWORD]@…` is not a credential.

Full details in [`AGENTS.md` §11.1](AGENTS.md).

---

## Deployment

Vercel, with `master` as the production branch and `develop` as the preview
branch. The runtime version is pinned exactly in `engines.node`: Vercel retired
Node 20 without notice and failed the build in two seconds with no change in the
repository, which is why a fixed version matters more than a flexible range.

Preview deployments are protected by SSO and do not respond to a plain `curl`.

> **One database.** While the app is in testing, development and production share
> the same Supabase instance. `db:push` and the migration scripts affect both.
> There is no separate dataset per environment.

### Required before the first deploy

The rate limiter and the max-2-users trigger live in the schema, not in Drizzle,
and are applied by a script:

```bash
npm run db:migrate:auth-seguridad
```

The app degrades gracefully if this has not run — login keeps working without the
rate limit — but **the 2-user cap is then only enforced in the application**, which
two simultaneous signups can race. Run it once per database.

---

## Known limitations

Listed here rather than buried, because a repo that claims more than it has is
worth less than one that is precise about its edges.

- **Migrations are not versioned.** `drizzle/` is gitignored and the schema
  evolves through idempotent scripts in `scripts/`, so a fresh clone has to run
  them by hand, in order. This is the most serious gap in the project and the
  first thing to fix.
- **No measured coverage.** 409 tests exist, but there is no coverage figure and
  no threshold in CI.
- **No end-to-end tests.** The critical flows are only covered at the unit level.
- **On an EOL-adjacent major.** Next.js 14 has 15 open high-severity advisories,
  several of which do affect the deployed artefact. The migration plan and the
  full analysis are in [`docs/security.md`](docs/security.md).
- **No production error reporting.** `error.tsx` shows the failure but reports
  nothing, and there is no structured logging or request id.
- **Bespoke auth.** Documented trade-off, not an oversight — see the design
  decisions section above.

---

## Documentation

| File | Contents |
|---|---|
| [`docs/spec.md`](docs/spec.md) | Functional specification: data model, rules, screen design *(Spanish)* |
| [`docs/security.md`](docs/security.md) | Security posture: advisory triage, implemented measures, accepted debt, migration plan *(Spanish)* |
| [`AGENTS.md`](AGENTS.md) | Development guide: architecture, SOLID principles, invariants, commands, connection troubleshooting *(Spanish)* |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Setup, project layout, invariants, commit conventions, review checklist |
| [`docs/mockups/`](docs/mockups) | Design mockups from the specification |

---

## Conventions

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/), in
  **English**, imperative: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`,
  `chore:`. One responsibility per commit.
- **Branches:** work happens on `develop`; `master` receives verified commits and
  deploys to production.
- **Before every commit:** `npm run typecheck && npm run lint && npm run test`.
- **Never committed:** `.env*`, keys, tokens, `node_modules`.

---

## License

MIT — see [LICENSE](LICENSE).