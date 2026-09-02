# Habit Shaper

Habit Shaper is a small habit-building and habit-breaking tracker with streaks,
weekly progress, history, and contextual goals.

## Run with Docker Compose

The primary reviewer path requires only Docker and Docker Compose.

```bash
git clone https://github.com/up2dul/habit-shaper.git
cd habit-shaper
cp .env.example .env
docker compose up --build
```

Open <http://localhost:5173>. Migrations run automatically before the API
starts. To stop the stack, press `Ctrl-C` and run:

```bash
docker compose down
```

To reset local data, including the MySQL volume, run:

```bash
docker compose down -v
```

The normal Compose file binds MySQL to `127.0.0.1:3306` (or `MYSQL_PORT`), so
it is available for local debugging but not on external network interfaces. The
API port is also exposed for local debugging. Production Compose removes the
public API port; use it with an external HTTPS reverse proxy:

```bash
docker compose -f docker-compose.yaml -f docker-compose.production.yaml up --build -d
```

The production proxy should route `/` to the web container and `/api/*` to the
API container. Set `WEB_ORIGIN` to the public HTTPS origin. MySQL remains
private to the Compose network.

## Environment variables

Copy `.env.example` to `.env` for local Compose. Values with local defaults can
be left unchanged.

| Variable | Purpose |
| --- | --- |
| `WEB_PORT` | Host port for the web UI; default `5173`. |
| `API_PORT` | Host port for local API debugging; default `3000`. |
| `WEB_ORIGIN` | Browser origin accepted for unsafe API requests. |
| `VITE_API_URL` | Public API base URL compiled into the web app; `/api` enables same-origin proxying. |
| `MYSQL_PORT` | Loopback-only host port for local MySQL debugging; default `3306`. |
| `MYSQL_DATABASE` | MySQL database and API database name. |
| `MYSQL_USER` | MySQL application user and API database user. |
| `MYSQL_PASSWORD` | MySQL application password and API database password. |
| `MYSQL_ROOT_PASSWORD` | MySQL root bootstrap password. |

Do not commit `.env` or production secrets. In production, provide the
database values and `WEB_ORIGIN` through the deployment environment rather than
using the example defaults.

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

Node.js 22+ and pnpm 10+ are needed only for direct local development:

```bash
pnpm install
pnpm dev:web
pnpm dev:api
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
