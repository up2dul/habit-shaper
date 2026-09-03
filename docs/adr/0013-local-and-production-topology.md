# ADR-0013: Support separate-origin local development and same-origin Compose

**Status:** Accepted

## Context

Local development benefits from directly exposed Vite and API ports. The
Docker Compose reviewer path benefits from one browser origin while retaining
direct API access for debugging.

Production deployment is outside the current project scope.

## Decision

Host development setup:

```text
web → localhost:5173
api → localhost:3000
```

Configure CORS and credentials correctly.

Docker Compose reviewer setup:

```text
browser → localhost:5173
            /      → web
            /api/* → api (Docker network)
```

The same-origin Compose proxy prevents session cookies from depending on the
hostname used to open the application and avoids browser traffic competing for
the API's published host port.

The API starts only after the one-shot `migrate` service succeeds, and its
`/health` endpoint checks database availability.

For local development, run `docker compose up -d mysql migrate api` and use
`pnpm dev:web`; the API remains available at `http://localhost:3000` for
debugging. Set `WEB_ORIGIN` to the browser origin when using a different web
port. Session cookies are HttpOnly, path-scoped to `/`, and SameSite=Lax. The
Compose web build uses the public `/api` path (`VITE_API_URL=/api`); no secrets
are exposed to the frontend.

## Alternatives considered

- Reverse proxy in every local workflow.
- Requiring a reverse proxy in the reviewer workflow.

## Consequences

- Host development stays easy to inspect and debug.
- The Compose reviewer flow uses reliable same-origin session cookies.
- The reviewer flow gets one origin and simpler cookie behavior.
- Production deployment requires a separate, intentionally designed setup.
