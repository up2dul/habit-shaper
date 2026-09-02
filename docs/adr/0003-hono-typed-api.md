# ADR-0003: Use Hono and its typed RPC client

**Status:** Accepted

## Context

The API should stay lightweight while preserving end-to-end TypeScript safety between Hono routes and the React client.

## Decision

Use Hono for the API and export `AppType = typeof app`. Use `hc<AppType>()` in the web app as the typed HTTP client.

Keep the client setup local to the web app initially rather than creating a separate `packages/api-client` package.

## Alternatives considered

- Express with manually duplicated request/response DTOs.
- NestJS with heavier controller/module/decorator structure.
- A separate hand-written API client package from day one.
- OpenAPI client generation as a mandatory architecture layer.

## Consequences

- Route, request, and response typing flow directly to the client.
- Fewer duplicated DTOs are needed.
- Hono remains small and easy to read.
- The web app must limit its dependency on the API app to contract/type-level concerns and not import backend internals.
