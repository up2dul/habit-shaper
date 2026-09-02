# ADR-0015: Keep testing and observability lightweight but targeted

**Status:** Accepted

## Context

The coding test values completeness and code quality, but the application does not justify a full production observability platform or a massive test suite.

## Decision

Use Vitest.

Prioritize unit tests for streak/schedule/weekly calculations and integration/API tests for authentication, atomic habit creation, log mutations, authorization, and cascading deletion.

Prefer real MySQL integration for database guarantees rather than mocking Drizzle heavily.

Expose `GET /health` and use Docker health checks.

Use Hono's built-in logger for basic HTTP logging. Never log credentials or session secrets.

Prometheus/Grafana/OpenTelemetry are nice-to-have only.

## Alternatives considered

- 100% coverage goals.
- Full browser E2E suite as a prerequisite.
- Mock-heavy database tests.
- Prometheus/Grafana as core architecture.

## Consequences

- Testing effort focuses on the rules most likely to break.
- Docker/VM debugging has enough health and request visibility.
- Optional observability can be added later without burdening the coding-test implementation.
