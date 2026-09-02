# ADR-0004: Use Drizzle ORM with MySQL

**Status:** Accepted

## Context

MySQL is required by the coding test. The data model is relational but modest, and the architecture favors explicit TypeScript and SQL-like behavior over heavy ORM abstraction.

## Decision

Use Drizzle ORM with MySQL.

## Alternatives considered

- Prisma.
- Raw SQL for all persistence.
- A heavier data-access framework.

## Consequences

- Schema definitions remain in TypeScript.
- Queries map closely to SQL concepts and stay reviewable.
- Transactions, joins, constraints, indexes, and migrations remain visible rather than hidden behind a large abstraction.
- Engineers still need to understand SQL behavior; this is considered a benefit for this project.
