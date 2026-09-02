# ADR-0013: Support separate-origin local development and same-origin VM deployment

**Status:** Accepted

## Context

Local development benefits from directly exposed Vite and API ports. VM deployment benefits from HTTPS, one public origin, and hiding internal service ports.

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

Production VM setup:

```text
https://habit.example.com/
  /      → web
  /api/* → api
```

Use Caddy or Nginx as the reverse proxy. Keep web/API/MySQL internal rather than exposing their container ports publicly.

The production application stack is started with:

```bash
WEB_ORIGIN=https://habit.example.com \
MYSQL_PASSWORD='replace-me' MYSQL_ROOT_PASSWORD='replace-me-too' \
docker compose -f docker-compose.yaml -f docker-compose.production.yaml up -d --build
```

The production override removes host port publication for `api`; an external
TLS reverse proxy should publish HTTPS and route `/` to `web:5173`
and `/api/*` to `api:3000` (or route both through the web container's nginx
proxy). MySQL is only reachable on the Compose network. The API starts only
after the one-shot `migrate` service succeeds, and its `/health` endpoint
checks database availability.

For local development, run `docker compose up -d mysql migrate api` and use
`pnpm dev:web`; the API remains available at `http://localhost:3000` for
debugging. Set `WEB_ORIGIN` to the browser origin when using a different web
port. Session cookies are HttpOnly, path-scoped to `/`, SameSite=Lax, and
Secure only in production. The browser should use the public `/api` path in
production (`VITE_API_URL=/api`); no secrets are exposed to the frontend.

## Alternatives considered

- Reverse proxy in every local workflow.
- Publicly exposing the API container port in production.
- Separate production domains for web and API.

## Consequences

- Host development stays easy to inspect and debug.
- The Compose reviewer flow uses reliable same-origin session cookies.
- Production gets one origin, simpler secure-cookie behavior, and a smaller public attack surface.
- Application code remains mostly identical; environment configuration changes by deployment.
