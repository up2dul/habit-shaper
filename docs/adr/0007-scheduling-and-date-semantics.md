# ADR-0007: Normalize weekday schedules and use date-only habit semantics

**Status:** Accepted

## Context

Users can choose the weekdays on which a habit applies. Habit completion is a calendar-day fact, not primarily a timestamped event.

## Decision

Store weekdays in a normalized `habit_schedules` table with one row per `(habit_id, day_of_week)` and a uniqueness constraint.

Use MySQL `DATE` for `habits.start_date` and `habit_logs.date`.

Use timestamp/datetime values for technical events such as creation/update times and session expiry.

Streaks follow scheduled occurrences rather than consecutive calendar dates.

## Alternatives considered

- JSON or comma-separated weekday arrays in the habit row.
- A generic recurrence engine such as RRULE or cron expressions.
- Storing completion only as UTC timestamps and deriving the day later.

## Consequences

- Weekday schedules are easy to query and constrain.
- Calendar-day bugs caused by timezone conversion are reduced.
- The schema communicates domain intent clearly.
- More complex recurrence rules are intentionally unsupported until required.
