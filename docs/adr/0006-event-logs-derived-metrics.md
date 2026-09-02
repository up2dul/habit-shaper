# ADR-0006: Model habits with event logs and derive streak metrics

**Status:** Accepted

## Context

Habit Shaper supports both build and break habits. The application needs current streaks, clean streaks, weekly completion, and missed days. Persisting mutable streak counters would create synchronization problems when historical logs are edited.

## Decision

Use one `habits` table with a `type` discriminator (`build` or `break`).

Use one `habit_logs` table that stores only meaningful events:

- build habit → `completed`
- break habit → `relapse`

Do not persist `missed`, `clean`, or mutable streak counters as source-of-truth state.

Derive:

- missed = past scheduled build day with no completion event;
- clean = past scheduled break day with no relapse event;
- streaks and weekly metrics from schedules + event history.

## Alternatives considered

- Separate tables for build and break habits.
- A generic `success` / `failure` status.
- Persisting all four states: completed, missed, clean, relapse.
- Persisting `current_streak` counters.

## Consequences

- Historical edits automatically change derived metrics correctly.
- The database stores facts rather than duplicated conclusions.
- Build and break habits share infrastructure while preserving domain meaning.
- Metric calculation logic needs strong tests.
