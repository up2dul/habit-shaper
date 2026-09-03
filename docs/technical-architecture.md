# Habit Shaper — Technical Architecture

**Status:** Approved for implementation  
**Scope:** Engineering coding test  
**Last consolidated:** 2026-09-02

## 1. Purpose

This document consolidates the technical architecture decisions made for Habit Shaper. The architecture is intentionally lightweight: enough structure to make the application reliable, testable, and easy to review, without introducing infrastructure or abstraction that the coding-test scope does not justify.

The source brief requires a React frontend, Node.js + TypeScript backend, MySQL database, email/password authentication, and a complete Docker Compose setup runnable from the repository root. The application must support habit building, habit breaking, streaks, weekly completion/missed-day tracking, and goals linked to habits.

## 2. Architecture principles

1. **Prefer explicit, boring architecture over framework ceremony.**
2. **Model the requirements we have, not speculative future requirements.**
3. **Persist facts; derive metrics.**
4. **Use database guarantees for database invariants.**
5. **The frontend is never a security boundary.**
6. **Keep a small, predictable query count rather than chasing “one query at all costs.”**
7. **Introduce shared packages or infrastructure only when there is a real cross-boundary need.**

## 3. High-level topology

### Local / reviewer environment

```text
Browser
  └── http://localhost:5173 → React/Vite web
                                └── /api/* → Hono API (Docker network)
                                                │
                                                ▼
                                            MySQL
```

The Docker Compose reviewer flow proxies `/api/*` through the web container so
browser requests and session cookies remain same-origin. Host-based Vite
development may still call the separately exposed API port with CORS and cookie
credentials configured explicitly.

### VM / production environment

```text
Internet
   │ HTTPS :443
   ▼
Reverse proxy (Caddy or Nginx)
   ├── /      → web container
   └── /api/* → api container
                    │
                    ▼
               MySQL container
```

Production uses one public origin. The web, API, and database containers do not need public ports except through the reverse proxy. MySQL must not be publicly exposed.

## 4. Repository structure

Use a pnpm workspace monorepo.

```text
habit-shaper/
├── apps/
│   ├── web/
│   └── api/
├── docs/
│   └── adr/
├── .github/
├── docker-compose.yaml
├── .env.example
├── lefthook.yml
├── oxlint.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── README.md
```

No root `packages/` directory is required initially. In particular:

- shadcn components stay in `apps/web/src/components/ui/`;
- the Hono typed client stays in the web app unless a real multi-consumer API-client package becomes necessary;
- avoid creating a generic `core` or `shared` package simply to hold a few types.

### Repository tooling

- pnpm workspaces
- TypeScript
- Oxlint
- formatter consistent with the existing preferred toolchain
- Lefthook
- Commitlint + Conventional Commits
- root scripts for lint, format, typecheck, and test

Changesets are intentionally excluded because this repository is an application, not a publishable package ecosystem.

## 5. Frontend architecture

### Stack

- React
- Vite
- TanStack Router
- TanStack Query
- TanStack Form
- shadcn/ui

The frontend is a **client-only SPA**. TanStack Start and React Router Framework Mode are not needed because the project already has a dedicated Node.js backend and does not require SSR, SEO-oriented rendering, frontend server functions, or a second server runtime.

### Suggested structure

```text
apps/web/src/
├── app/
│   ├── router/
│   ├── providers/
│   └── styles/
├── modules/
│   ├── auth/
│   ├── habits/
│   └── tracking/
├── components/
│   └── ui/
├── lib/
│   ├── api.ts
│   └── utils.ts
└── main.tsx
```

This is domain-oriented / feature-based organization inspired by DDD, not full tactical DDD.

### Client state model

```text
Server state     → TanStack Query
Form state       → TanStack Form
Small UI state   → React local state
Global state     → none unless a real need appears
```

Do not duplicate server data in Zustand/Redux or another client store.

Authentication state is represented by a query such as `GET /auth/me`; the credential itself remains in an HTTP-only browser cookie.

## 6. Backend architecture

### Stack

- Node.js + TypeScript
- Hono
- schema validation compatible with Hono's typed RPC flow
- Drizzle ORM
- MySQL

### Module structure

```text
apps/api/src/
├── app.ts
├── server.ts
├── db/
│   ├── client.ts
│   └── schema/
├── middleware/
│   └── auth.ts
└── modules/
    ├── auth/
    │   ├── auth.routes.ts
    │   ├── auth.service.ts
    │   └── auth.schema.ts
    ├── habits/
    │   ├── habits.routes.ts
    │   ├── habits.service.ts
    │   └── habits.schema.ts
    └── tracking/
        ├── tracking.routes.ts
        ├── tracking.service.ts
        └── tracking.schema.ts
```

### Layering

```text
route → service → Drizzle → MySQL
```

Routes own HTTP concerns: request validation, authenticated context, status codes, and response serialization.

Services own application/domain behavior and may call Drizzle directly.

A repository abstraction is intentionally not introduced. For this app it would mostly wrap Drizzle without providing a meaningful boundary.

## 7. Typed API client

Hono's `hc<AppType>()` is used as the typed HTTP client.

The API exports only its route type:

```ts
export type AppType = typeof app;
```

The web app creates the typed client:

```ts
import { hc } from "hono/client";
import type { AppType } from "@habit-shaper/api";

export const api = hc<AppType>(import.meta.env.VITE_API_URL);
```

The web app may type-import the API contract, but it must not import backend services, database schema implementation details, repositories, or business internals.

A separate `packages/api-client` package is deferred until there are multiple consumers or meaningful shared client behavior.

## 8. REST API conventions

Do not add `/v1` prematurely. API versioning should be introduced only when a breaking public contract must coexist with an older one.

Suggested routes:

```text
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/me

GET    /habits
POST   /habits
GET    /habits/:habitId
PATCH  /habits/:habitId
DELETE /habits/:habitId

POST   /habits/:habitId/logs
DELETE /habits/:habitId/logs/:date
```

Deployment may expose these under `/api/*` through a reverse proxy; `/api` is not required to be baked into Hono's internal route definitions.

### Response conventions

Successful responses return the resource/data directly. Do not wrap every response with `{ success: true }`.

Errors use a consistent shape:

```json
{
  "error": {
    "code": "HABIT_NOT_FOUND",
    "message": "Habit not found"
  }
}
```

A global Hono error handler maps typed application errors to HTTP responses.

Services should express semantic errors; HTTP status mapping remains in the HTTP layer.

Error codes are enumerated once (`ERROR_CODES`) with a central registry defining each code's default message and HTTP status. `AppError(code)` derives both from the registry, with an optional per-instance message override for dynamic messages. The HTTP layer applies the status mapping.

Use named HTTP status constants rather than unexplained magic numbers if desired, while still passing explicit statuses to Hono for accurate typed response inference.

## 9. Core data model

### 9.1 Users

Conceptual fields:

```text
users
- id
- name               required display name
- email              UNIQUE
- password_hash
- created_at
- updated_at
```

Passwords are never stored or reversibly encrypted. Use Argon2id for password hashing.

`name` is a required user-chosen display name, not a legal-name field. Trim leading
and trailing whitespace before storage, require 1–100 Unicode characters, and reject
control characters and line breaks at the API boundary. Names are neither unique nor
indexed.

### 9.2 Sessions

```text
sessions
- id                 opaque random session identifier
- user_id            FK → users.id
- expires_at
- created_at
```

Session IDs are sent in an HTTP-only cookie. JWTs are not required.

### 9.3 Habits

Build and break habits share one table with a discriminator.

```text
habits
- id
- user_id            FK → users.id
- name
- type               build | break
- start_date          DATE
- created_at
- updated_at
```

Do not create separate build-habit and break-habit tables unless their structures genuinely diverge later.

### 9.4 Habit schedules

Specific active weekdays are normalized into their own table.

```text
habit_schedules
- habit_id           FK → habits.id ON DELETE CASCADE
- day_of_week        0..6

UNIQUE(habit_id, day_of_week)
```

The application supports explicit weekdays only. Do not introduce RRULE, cron expressions, arbitrary recurrence DSLs, odd-date rules, or other speculative recurrence engines.

### 9.5 Habit logs

Logs store meaningful events only.

```text
habit_logs
- habit_id           FK → habits.id ON DELETE CASCADE
- date               DATE
- status             completed | relapse

UNIQUE(habit_id, date)
```

Interpretation depends on habit type:

#### Build habit

```text
completion row exists                     → completed
past scheduled day + no completion row   → missed
```

#### Break habit

```text
relapse row exists                        → relapse
past scheduled day + no relapse row       → clean
```

`missed` and `clean` are derived states, not persisted events.

Editing a historical log generally means inserting or deleting the relevant event row:

```text
Build: mark completed → INSERT completion
Build: undo completed → DELETE completion

Break: report relapse → INSERT relapse
Break: undo relapse   → DELETE relapse
```

### 9.6 Goals

The source requirements say each goal is linked to a build or break habit. This session did not finalize the exact goal fields or relationship cardinality. Implementation must preserve the product requirements, but the detailed goal schema should be finalized against the product-planning document rather than invented here.

## 10. Streak and weekly-metric calculation

**Persist facts; derive metrics.**

Do not persist mutable counters such as `current_streak` as the source of truth.

Derived metrics include:

- current build streak
- current clean streak
- weekly completion count/rate
- weekly missed days
- optional longest streak if later needed

Changing historical logs automatically changes derived metrics without needing to keep a separate counter synchronized.

Streaks follow **scheduled occurrences**, not consecutive calendar dates. For a Monday/Wednesday/Friday habit, Monday → Wednesday → Friday can form a three-occurrence streak.

Database row storage order is irrelevant. Chronological behavior must use explicit `ORDER BY date` or equivalent ordered processing.

## 11. Date and time semantics

Use date-only columns for calendar-domain concepts:

```text
habits.start_date   → DATE
habit_logs.date     → DATE
```

Use timestamp/datetime types for system events:

```text
created_at
updated_at
sessions.expires_at
```

A habit completion means “completed on 2026-09-02,” not “completed at a UTC instant from which we later guess the intended day.”

The client sends explicit ISO date-only values such as:

```json
{ "date": "2026-09-02" }
```

Do not derive the user's intended habit day carelessly from the VM's local time or a UTC timestamp.

No user-timezone preference field is required for the current lightweight scope.

## 12. Authentication and session lifecycle

### Registration and current user

Registration accepts required `name`, `email`, and `password` fields. Registration
and `GET /auth/me` expose only the safe user shape: `id`, `name`, and `email`.
Password hashes and session records are never serialized to the client. Editing a
display name remains out of scope until profile management is explicitly required.

### Login

```text
email + password
→ verify Argon2id hash
→ create DB session with expiry
→ set opaque session ID as HTTP-only cookie
```

Recommended session lifetime for this test: approximately seven days.

Cookie attributes:

```text
HttpOnly
Secure       in production
SameSite=Lax
Path=/
Max-Age      aligned with session lifetime
```

### Protected request

```text
request arrives
→ auth middleware reads session cookie
→ lookup session in DB
→ verify session exists and is not expired
→ attach authenticated user context
→ execute route/service logic
```

This happens per protected request. There is no client polling loop checking session expiry.

### Logout

```text
POST /auth/logout
→ delete current DB session row
→ clear browser cookie
```

### Natural expiry

Expired session rows may remain in the database for now. They are invalid once `expires_at` is in the past. Periodic cleanup is optional and not required for the coding test.

## 13. Authorization

The frontend is not trusted for authorization.

For user-owned resources, ownership should be part of the database operation wherever possible:

```sql
SELECT *
FROM habits
WHERE id = ?
  AND user_id = ?;
```

Likewise for updates and deletes.

If the requested resource does not exist for the authenticated user, return `404` rather than revealing that another user's resource exists.

## 14. CSRF and browser security

Cookie authentication requires deliberate CSRF protection because browsers can attach cookies automatically.

For this application:

1. use `SameSite=Lax` session cookies;
2. use `Secure` in production;
3. configure CORS to allow only the known web origin in local cross-origin development;
4. validate the `Origin` header for unsafe/state-changing methods;
5. use proper HTTP methods (`POST`, `PATCH`, `DELETE`) for mutations; never mutate state via `GET`;
6. retain server-side authorization regardless of what the frontend renders.

A separate synchronizer CSRF-token system is not required for the current same-site production architecture, but can be revisited if future requirements need looser cross-site cookie behavior or embedding.

## 15. Database integrity and query strategy

### Constraints

Use database constraints for invariants that MySQL can guarantee naturally:

```text
UNIQUE(users.email)
UNIQUE(habit_schedules.habit_id, day_of_week)
UNIQUE(habit_logs.habit_id, date)
FOREIGN KEY relationships
ON DELETE CASCADE for true dependent child rows
```

### Cascading deletes

Deleting a habit should remove child schedules and logs through foreign-key `ON DELETE CASCADE` because those rows are meaningless without the habit.

### Transactions

Use a transaction when one user action spans multiple writes that must succeed or fail together.

Examples:

- create habit + schedules
- edit habit + replace schedule rows
- registration + initial session creation when implemented as one atomic workflow

Do not wrap every query in a transaction.

### Indexes

Apply lightweight, obvious indexes/unique indexes based on real query paths:

```text
users(email)
sessions(id)
habits(user_id)
habit_logs(habit_id, date)
habit_schedules(habit_id, day_of_week)
```

This is basic database hygiene, not advanced performance tuning.

### N+1 avoidance

Avoid per-habit query loops such as:

```text
1 query for habits
+ 1 schedule query per habit
+ 1 logs query per habit
```

Prefer a small fixed number of batch queries, for example:

```text
1 query → habits
1 query → schedules for those habit IDs
1 query → relevant logs for those habit IDs/date range
```

Do not force all data into one giant join if a few clear queries are easier to understand.

## 16. Query scope and over-fetching

Do not fetch all historical logs on every dashboard request if the UI only needs recent data plus enough history to calculate a streak.

Prefer purpose-driven ranges and server-side derivation where practical.

No Redis, caching layer, denormalized metric store, or other performance infrastructure is needed for the current scope.

## 17. Database migrations and seed data

Drizzle schema definitions live in TypeScript. Generated SQL migration files are committed to Git.

Required startup flow:

```text
docker compose up
→ MySQL starts
→ DB health check passes
→ API applies pending migrations
→ API starts
→ web starts
```

The reviewer must not need to run a separate migration command.

Do not use schema push as the canonical production/bootstrap history when checked-in migrations can provide reproducible evolution.

Seed data is optional and explicit:

```bash
pnpm db:seed
```

or through Docker without a local Node.js toolchain:

```bash
docker compose run --rm seed
```

Seed scripts should be idempotent where practical. A development-only `db:reset` convenience script may reset, migrate, and seed, but it is not part of the required reviewer path.

## 18. Docker Compose

The repository root contains `docker-compose.yaml` and `.env.example`.

Base services:

```text
mysql
migrate
api
web
```

The API depends on a healthy database. The exact Compose implementation must ensure migrations run before the API serves requests.

The source brief requires the full application to run with Docker + Docker Compose only; no host Node.js or MySQL installation may be required.

## 19. Environment configuration

Keep variables explicit and minimal. Example categories:

```text
MYSQL_DATABASE
MYSQL_USER
MYSQL_PASSWORD
MYSQL_ROOT_PASSWORD

API_PORT
WEB_PORT
APP_ORIGIN
SESSION_TTL_SECONDS
```

Frontend-only public configuration uses Vite-prefixed variables such as:

```text
VITE_API_URL
```

Server secrets and database credentials must never be exposed through Vite environment variables.

The API should validate required environment variables at startup and fail fast on invalid configuration.

## 20. Health checks and logging

Core observability is intentionally lightweight.

### Health

Expose:

```text
GET /health
→ 200 { "status": "ok" }
```

Use Docker health checks for MySQL and the API.

### Logging

Hono's built-in logger is sufficient for basic HTTP request logging.

Never log:

- passwords
- password hashes
- raw session IDs
- cookies
- other secrets

Prometheus/Grafana/OpenTelemetry are **nice-to-have only**, not part of the core implementation. If added later, application instrumentation would expose metrics and Prometheus would scrape them; Grafana would visualize the stored metrics.

## 21. Testing strategy

Use Vitest across the workspace.

### Highest-value unit tests

Test pure domain behavior thoroughly:

- build streak calculation
- clean streak calculation
- scheduled-day semantics
- skipped weekdays
- historical log edits
- weekly completion/missed-day calculations

### Integration/API tests

Prioritize critical workflows:

```text
register → session created
login → cookie returned
protected route without session → 401
create habit → habit + schedules persisted atomically
build log insert/delete
break relapse insert/delete
delete habit → dependent rows removed
```

Prefer real MySQL integration for database behavior such as transactions, constraints, and cascades rather than heavily mocking Drizzle.

A full browser E2E suite is optional if time remains. Do not chase 100% line coverage.

## 22. Deferred / intentionally excluded

The following are intentionally not part of the core architecture:

- microservices
- Redis
- queues/event bus
- JWT access/refresh token architecture
- full tactical DDD
- repository abstraction over Drizzle
- TanStack Start / SSR
- Redux/Zustand
- root shared UI package
- premature API versioning
- generic recurrence engine
- persisted streak counters
- mandatory seed on every boot
- Prometheus/Grafana stack
- advanced query-plan tuning / covering-index optimization

These can be introduced later only when a real requirement justifies their complexity.

## 23. Implementation readiness

The architecture is considered sufficient for implementation. Further architecture expansion should be driven by concrete implementation findings rather than speculative completeness.
