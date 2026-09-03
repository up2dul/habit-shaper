# Habit Shaper

Habit Shaper is a small habit-building and habit-breaking tracker with streaks,
weekly progress, history, and contextual goals.

## Tech stack

- **Web:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, and TanStack
  Router, Query, and Form
- **API:** Node.js and Hono, with Zod validation and HTTP-only session
  authentication
- **Data:** MySQL and Drizzle ORM
- **Delivery:** Docker Compose and Nginx with same-origin `/api` proxying
- **Tooling:** pnpm workspaces, Vitest, Oxlint, Oxfmt, and Lefthook

## Getting started

### Clone the repository

```bash
git clone https://github.com/up2dul/habit-shaper.git
cd habit-shaper
```

If your GitHub SSH key is configured, use this clone URL instead:

```bash
git clone git@github.com:up2dul/habit-shaper.git
cd habit-shaper
```

### Local setup

Node.js 22+ and pnpm 10+ are required for direct local development. Install
dependencies:

```bash
pnpm install
```

### Local run

Start the API and web development servers in separate terminals:

```bash
pnpm dev:api
pnpm dev:web
```

The web app is available at <http://localhost:5173>. Direct local development
uses the API at <http://localhost:3000> and requires a running MySQL instance.
When `VITE_API_URL` is unset in development, the web app uses that address as a
code-level fallback because the standalone Vite server does not provide the
`/api` reverse proxy. The `pnpm dev:web` command starts a development server; it
is not a production deployment command.

### Run through Docker

The primary reviewer path requires only Docker and Docker Compose.

```bash
docker compose up -d
```

Open <http://localhost:5173>. Migrations run automatically before the API
starts. The Compose defaults require no `.env` file; copy `.env.example` only
when you want to customize them. In this workflow, `VITE_API_URL=/api` sends
browser requests to the web app's own origin, where Nginx proxies them to the
API container. To stop the detached stack, run:

```bash
docker compose down
```

Optionally load a reproducible demo account after the stack starts:

```bash
docker compose run --rm seed
```

Sign in with `demo@example.com` and password `demo12345`. Rerunning the command
restores that demo account and its rolling 14-day history without changing any
other users.

To reset local data, including the MySQL volume, run:

```bash
docker compose down -v
```

The Compose file binds MySQL and the API to the `127.0.0.1` loopback interface
(using `MYSQL_PORT` and `API_PORT`), so they remain available for local
debugging without being exposed on external network interfaces. Production
deployment concerns such as HTTPS termination, secrets, backups, and monitoring
are outside this project's current scope.

## Environment variables

Copy `.env.example` to `.env` for local Compose. Values with local defaults can
be left unchanged.

| Variable              | Purpose                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `WEB_PORT`            | Host port for the web UI; default `5173`.                                                               |
| `API_PORT`            | Host port for local API debugging; default `3000`.                                                      |
| `WEB_ORIGIN`          | Browser origin accepted for unsafe API requests.                                                        |
| `VITE_API_URL`        | Browser-facing API base URL compiled into the web app; Compose defaults to the Nginx proxy path `/api`. |
| `MYSQL_PORT`          | Loopback-only host port for local MySQL debugging; default `3306`.                                      |
| `MYSQL_DATABASE`      | MySQL database and API database name.                                                                   |
| `MYSQL_USER`          | MySQL application user and API database user.                                                           |
| `MYSQL_PASSWORD`      | MySQL application password and API database password.                                                   |
| `MYSQL_ROOT_PASSWORD` | MySQL root bootstrap password.                                                                          |

Do not commit `.env` or production secrets. In production, provide the
database values and `WEB_ORIGIN` through the deployment environment rather than
using the example defaults. Deploy the built web assets behind a web server or
reverse proxy, and set `VITE_API_URL` explicitly when creating the production
build. The provided web Docker image does this with `/api` by default. Complete
production deployment concerns remain outside this project's current scope.

## Architecture

The application is a pnpm workspace containing a React/Vite SPA and a
Node.js/TypeScript Hono API backed by MySQL and Drizzle ORM:

```text
Browser → web (React + Nginx) → /api/* → api (Hono) → MySQL
                                      └── migrate runs first
```

The API follows `route → service → Drizzle → MySQL`. Facts such as tracking
events are persisted and streaks/progress are derived. Authentication uses a
database-backed, HTTP-only session cookie with `SameSite=Lax`; production
cookies are `Secure`.

## Development and verification

```bash
pnpm test
pnpm lint
pnpm format:check
pnpm typecheck
```

The full Docker validation path is:

```bash
docker compose down -v
docker compose up --build
```

## Product assumptions and limitations

- A habit has either BUILD or BREAK semantics, with schedule and history based
  on the user's local calendar dates.
- Tracking today is idempotent and can be undone; valid historical entries can
  be corrected.
- Goals are contextual to owned habits and support create, edit, and delete.
- The frontend is a client-only SPA; server-side rendering is intentionally out
  of scope.
- There is no JWT, Redis, queue, repository abstraction, API versioning, or
  built-in certificate manager.
- Production HTTPS termination and DNS are provided by an external Caddy,
  Nginx, or Traefik deployment.

See [`docs/technical-architecture.md`](docs/technical-architecture.md) and the
[architecture decision records](docs/adr/README.md) for the detailed design.
