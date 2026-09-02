# ADR-0007: Normalize weekday schedules and use date-only habit semantics

**Status:** Accepted

## Context

Users can choose the weekdays on which a habit applies. Habit completion is a calendar-day fact, not primarily a timestamped event.

## Decision

Store versioned schedules in `habit_schedules`, keyed by habit and effective date,
with normalized weekday rows in `habit_schedule_days`.

Creating a BUILD habit creates its first schedule version effective on the
habit's start date. Editing its weekdays creates (or replaces) the version
effective on the edit date. Earlier versions remain intact so later tracking
and calculation work does not reinterpret historical dates.

BREAK habits are continuously active from their start date and must not have
schedule rows.

Use MySQL `DATE` for `habits.start_date` and `habit_logs.date`.

Use timestamp/datetime values for technical events such as creation/update times and session expiry.

Streaks follow scheduled occurrences rather than consecutive calendar dates.

## Alternatives considered

- JSON or comma-separated weekday arrays in the habit row.
- A generic recurrence engine such as RRULE or cron expressions.
- Storing completion only as UTC timestamps and deriving the day later.

## Consequences

- Weekday schedules are easy to query and constrain.
- Schedule changes preserve the meaning of prior calendar dates.
- Calendar-day bugs caused by timezone conversion are reduced.
- The schema communicates domain intent clearly.
- More complex recurrence rules are intentionally unsupported until required.
