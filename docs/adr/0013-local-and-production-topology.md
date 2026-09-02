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

## Alternatives considered

- Reverse proxy in every local workflow.
- Publicly exposing the API container port in production.
- Separate production domains for web and API.

## Consequences

- Host development stays easy to inspect and debug.
- The Compose reviewer flow uses reliable same-origin session cookies.
- Production gets one origin, simpler secure-cookie behavior, and a smaller public attack surface.
- Application code remains mostly identical; environment configuration changes by deployment.
