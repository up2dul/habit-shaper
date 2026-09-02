# ADR-0013: Support separate-origin local development and same-origin VM deployment

**Status:** Accepted

## Context

Local development benefits from directly exposed Vite and API ports. VM deployment benefits from HTTPS, one public origin, and hiding internal service ports.

## Decision

Local/reviewer setup:

```text
web → localhost:5173
api → localhost:3000
```

Configure CORS and credentials correctly.

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

- Local setup stays easy to inspect and debug.
- Production gets one origin, simpler secure-cookie behavior, and a smaller public attack surface.
- Application code remains mostly identical; environment configuration changes by deployment.
