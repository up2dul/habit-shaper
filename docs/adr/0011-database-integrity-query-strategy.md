# ADR-0011: Use database constraints, transactions, cascades, indexes, and batch queries

**Status:** Accepted

## Context

Even a lightweight app can produce inconsistent data through concurrent requests, multi-write failures, duplicate rows, or naive per-parent querying.

## Decision

Use UUIDv7 for persistent entity identifiers such as `users.id` and `habits.id` (and `habit_logs.id` if logs retain a standalone ID). Generate these IDs in the application before insert and store them as 36-character UUID strings in MySQL.

Do not add a separate numeric internal ID or public-ID layer for this lightweight application.

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
- Auto-increment integer IDs for application entities.
- Random UUIDv4 identifiers.
- ULID/CUID or separate internal/public identifier pairs.

## Consequences

- Data invariants survive application mistakes and concurrency better.
- Query count remains predictable.
- The implementation gets useful protections with little added complexity.
- Database features remain visible and intentional rather than hidden.
- Entity IDs can be generated without a database round trip and exposed in API routes without revealing simple record counts.
- UUIDv7 keeps identifiers time-ordered, which is friendlier to indexed inserts than fully random UUIDv4 values.
- UUID strings consume more storage than integer IDs, but the cost is negligible at this application's expected scale.
