# ADR-0011: Use database constraints, transactions, cascades, indexes, and batch queries

**Status:** Accepted

## Context

Even a lightweight app can produce inconsistent data through concurrent requests, multi-write failures, duplicate rows, or naive per-parent querying.

## Decision

Use MySQL guarantees where they naturally fit:

- unique user email;
- unique `(habit_id, day_of_week)` schedule;
- unique `(habit_id, date)` log;
- foreign keys;
- `ON DELETE CASCADE` for schedules/logs that have no meaning without their habit.

Use transactions for multi-write user actions that must be atomic.

Add obvious indexes based on actual access paths.

Avoid N+1 by batching related schedules/logs rather than querying them in per-habit loops.

Do not over-optimize beyond these cheap protections.

## Alternatives considered

- Application-only integrity checks.
- Manual child deletion for every parent deletion.
- Transactions around every query.
- One query per habit for related data.
- Advanced caching/query-plan optimization before evidence of need.

## Consequences

- Data invariants survive application mistakes and concurrency better.
- Query count remains predictable.
- The implementation gets useful protections with little added complexity.
- Database features remain visible and intentional rather than hidden.
