# Architecture Decision Records

This directory records the significant engineering decisions for Habit Shaper.

Each ADR captures context, the decision, alternatives considered, and consequences. These records intentionally favor the coding-test scope: clear reasoning and low accidental complexity over enterprise-style architecture.

## Index

- [ADR-0001 — Use a pnpm monorepo with two applications](0001-pnpm-monorepo.md)
- [ADR-0002 — Use a client-only React SPA](0002-client-only-react-spa.md)
- [ADR-0003 — Use Hono and its typed RPC client](0003-hono-typed-api.md)
- [ADR-0004 — Use Drizzle ORM with MySQL](0004-drizzle-mysql.md)
- [ADR-0005 — Use domain-oriented modules with a service layer and no repository layer](0005-backend-module-boundaries.md)
- [ADR-0006 — Model habits with event logs and derive streak metrics](0006-event-logs-derived-metrics.md)
- [ADR-0007 — Normalize weekday schedules and use date-only habit semantics](0007-scheduling-and-date-semantics.md)
- [ADR-0008 — Use DB-backed opaque sessions in HTTP-only cookies](0008-db-backed-sessions.md)
- [ADR-0009 — Use REST-oriented routes and standardized errors without premature versioning](0009-rest-api-conventions.md)
- [ADR-0010 — Enforce security at the server and database boundaries](0010-authz-csrf-security.md)
- [ADR-0011 — Use database constraints, transactions, cascades, indexes, and batch queries](0011-database-integrity-query-strategy.md)
- [ADR-0012 — Run checked-in migrations automatically; keep seeding optional](0012-migrations-and-seeding.md)
- [ADR-0013 — Support separate-origin local development and same-origin VM deployment](0013-local-and-production-topology.md)
- [ADR-0014 — Use TanStack Query/Form and avoid a global state store](0014-frontend-state-management.md)
- [ADR-0015 — Keep testing and observability lightweight but targeted](0015-testing-observability.md)
