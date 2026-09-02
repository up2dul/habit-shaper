# ADR-0002: Use a client-only React SPA

**Status:** Accepted

## Context

The brief requires React on the frontend and a dedicated Node.js backend. The application does not need SSR, SEO-oriented rendering, frontend server functions, or another server runtime.

## Decision

Use React + Vite + TanStack Router as a client-only SPA.

Do not use TanStack Start or React Router Framework Mode for full-stack/server functionality.

## Alternatives considered

- TanStack Start.
- React Router Framework Mode.
- Next.js or another SSR/full-stack React framework.

## Consequences

- The frontend/backend boundary remains explicit.
- There is only one backend runtime to reason about.
- Deployment is simpler and the reviewer sees less unnecessary framework machinery.
- SSR-specific capabilities are intentionally unavailable unless requirements change.
