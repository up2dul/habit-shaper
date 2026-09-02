# Habit Shaping

Habit Shaper helps a user repeatedly perform a desired behavior or abstain from an undesired behavior while measuring progress from calendar-day facts.

## Language

**BUILD habit**:
A desired behavior the user intends to perform on selected weekdays.
_Avoid_: Positive habit, scheduled habit

**BREAK habit**:
An undesired behavior the user intends to avoid every calendar day.
_Avoid_: Negative habit, quit habit

**Occurrence**:
A calendar date on which a BUILD habit is scheduled to be performed.
_Avoid_: Instance, task

**Completion**:
A persisted fact that a BUILD occurrence was performed.
_Avoid_: Success event, check-in

**Relapse**:
A persisted fact that a BREAK habit occurred on a calendar date.
_Avoid_: Failure, incomplete

**Day state**:
A conclusion derived for one habit and calendar date: completed, missed, pending, clean, relapse, or not applicable.
_Avoid_: Log status, stored status

**Current BUILD streak**:
The consecutive scheduled occurrences completed most recently; an incomplete occurrence today remains pending and does not end it.
_Avoid_: Daily streak, calendar streak

**Clean streak**:
The consecutive calendar days without a relapse, bounded by a BREAK habit's start date.
_Avoid_: BREAK streak, completion streak

**Schedule version**:
The weekday selection that governs BUILD occurrences from a particular calendar date until a later version takes effect.
_Avoid_: Current schedule, recurrence rule

**Successful day**:
A completed scheduled occurrence for a BUILD habit or a clean calendar day for a BREAK habit.
_Avoid_: Completed day
