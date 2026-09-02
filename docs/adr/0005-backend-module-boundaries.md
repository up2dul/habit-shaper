# ADR-0005: Use domain-oriented modules with a service layer and no repository layer

**Status:** Accepted

## Context

The backend needs enough separation to keep HTTP concerns out of business logic, but the application is too small to justify enterprise-style layering.

## Decision

Organize backend code by domain modules such as `auth`, `habits`, and `tracking`.

Use the flow:

```text
route → service → Drizzle → MySQL
```

Routes own HTTP concerns. Services own application behavior and may call Drizzle directly.

Do not add a repository layer unless a concrete persistence-boundary need appears.

## Alternatives considered

- Global `controllers/`, `services/`, `repositories/`, `models/` folders.
- Full DDD tactical patterns with aggregates, value objects, repositories, and domain services.
- Route handlers containing all business and persistence logic.

## Consequences

- Business behavior remains testable without HTTP.
- The number of layers stays proportional to the app.
- Drizzle is not hidden behind forwarding repository methods.
- If persistence becomes significantly more complex later, a repository boundary can be introduced deliberately.
