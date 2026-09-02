export type CalendarDate = string;
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ScheduleVersion = {
  effectiveFrom: CalendarDate;
  days: readonly Weekday[];
};

export type BuildDayState =
  | "COMPLETED"
  | "MISSED"
  | "PENDING"
  | "NOT_APPLICABLE";

export type BreakDayState = "CLEAN" | "RELAPSE" | "NOT_APPLICABLE";

export type BuildWeeklySummary = {
  completed: number;
  missed: number;
  pending: number;
  completionRate: number | null;
};

export type BreakWeeklySummary = {
  clean: number;
  relapse: number;
};

type BuildFacts = {
  startDate: CalendarDate;
  scheduleVersions: readonly ScheduleVersion[];
  completionDates: readonly CalendarDate[];
  today: CalendarDate;
};

type BreakFacts = {
  startDate: CalendarDate;
  relapseDates: readonly CalendarDate[];
  today: CalendarDate;
};

export function resolveEffectiveSchedule(
  scheduleVersions: readonly ScheduleVersion[],
  date: CalendarDate
): ScheduleVersion | null {
  assertCalendarDate(date);
  let effective: ScheduleVersion | null = null;
  for (const version of scheduleVersions) {
    assertCalendarDate(version.effectiveFrom);
    if (
      version.effectiveFrom <= date &&
      (!effective || version.effectiveFrom > effective.effectiveFrom)
    ) {
      effective = version;
    }
  }
  return effective;
}

export function isBuildScheduledOn(
  startDate: CalendarDate,
  scheduleVersions: readonly ScheduleVersion[],
  date: CalendarDate
): boolean {
  assertCalendarDate(startDate);
  assertCalendarDate(date);
  if (date < startDate) return false;
  const schedule = resolveEffectiveSchedule(scheduleVersions, date);
  return schedule?.days.includes(weekday(date)) ?? false;
}

export function resolveBuildDayState(
  facts: BuildFacts,
  date: CalendarDate
): BuildDayState {
  assertCalendarDate(facts.today);
  assertCalendarDate(date);
  if (
    date > facts.today ||
    !isBuildScheduledOn(facts.startDate, facts.scheduleVersions, date)
  ) {
    return "NOT_APPLICABLE";
  }
  if (new Set(facts.completionDates).has(date)) return "COMPLETED";
  return date === facts.today ? "PENDING" : "MISSED";
}

export function resolveBreakDayState(
  facts: BreakFacts,
  date: CalendarDate
): BreakDayState {
  assertCalendarDate(facts.startDate);
  assertCalendarDate(facts.today);
  assertCalendarDate(date);
  if (date < facts.startDate || date > facts.today) return "NOT_APPLICABLE";
  return new Set(facts.relapseDates).has(date) ? "RELAPSE" : "CLEAN";
}

export function calculateBuildStreak(facts: BuildFacts): number {
  assertCalendarDate(facts.startDate);
  assertCalendarDate(facts.today);
  if (facts.today < facts.startDate) return 0;
  const completions = new Set(facts.completionDates);
  let streak = 0;
  let date = facts.today;
  let skippedPendingToday = false;

  while (date >= facts.startDate) {
    if (isBuildScheduledOn(facts.startDate, facts.scheduleVersions, date)) {
      if (completions.has(date)) streak += 1;
      else if (date === facts.today && !skippedPendingToday) {
        skippedPendingToday = true;
      } else break;
    }
    date = addDays(date, -1);
  }
  return streak;
}

export function calculateBreakStreak(facts: BreakFacts): number {
  assertCalendarDate(facts.startDate);
  assertCalendarDate(facts.today);
  if (facts.today < facts.startDate) return 0;
  const relapses = new Set(facts.relapseDates);
  let streak = 0;
  let date = facts.today;
  while (date >= facts.startDate && !relapses.has(date)) {
    streak += 1;
    date = addDays(date, -1);
  }
  return streak;
}

export function calculateBuildWeeklySummary(
  facts: BuildFacts,
  weekStart: CalendarDate
): BuildWeeklySummary {
  const summary: BuildWeeklySummary = {
    completed: 0,
    missed: 0,
    pending: 0,
    completionRate: null,
  };
  forEachWeekDate(weekStart, (date) => {
    const state = resolveBuildDayState(facts, date);
    if (state === "COMPLETED") summary.completed += 1;
    if (state === "MISSED") summary.missed += 1;
    if (state === "PENDING") summary.pending += 1;
  });
  const decided = summary.completed + summary.missed;
  summary.completionRate = decided === 0 ? null : summary.completed / decided;
  return summary;
}

export function calculateBreakWeeklySummary(
  facts: BreakFacts,
  weekStart: CalendarDate
): BreakWeeklySummary {
  const summary: BreakWeeklySummary = { clean: 0, relapse: 0 };
  forEachWeekDate(weekStart, (date) => {
    const state = resolveBreakDayState(facts, date);
    if (state === "CLEAN") summary.clean += 1;
    if (state === "RELAPSE") summary.relapse += 1;
  });
  return summary;
}

export function calculateGoalSuccessfulDays(
  facts: ({ type: "BUILD" } & BuildFacts) | ({ type: "BREAK" } & BreakFacts)
): number {
  if (facts.type === "BUILD") {
    return new Set(facts.completionDates)
      .values()
      .reduce(
        (count, date) =>
          date <= facts.today &&
          isBuildScheduledOn(facts.startDate, facts.scheduleVersions, date)
            ? count + 1
            : count,
        0
      );
  }
  if (facts.today < facts.startDate) return 0;
  const relapses = new Set(facts.relapseDates);
  let successfulDays = 0;
  for (
    let date = facts.startDate;
    date <= facts.today;
    date = addDays(date, 1)
  ) {
    if (!relapses.has(date)) successfulDays += 1;
  }
  return successfulDays;
}

export function isHistoryDateEditable(
  facts:
    | ({ type: "BUILD" } & Pick<
        BuildFacts,
        "startDate" | "scheduleVersions" | "today"
      >)
    | ({ type: "BREAK" } & Pick<BreakFacts, "startDate" | "today">),
  date: CalendarDate
): boolean {
  assertCalendarDate(facts.startDate);
  assertCalendarDate(facts.today);
  assertCalendarDate(date);
  if (date < facts.startDate || date > facts.today) return false;
  return facts.type === "BREAK"
    ? true
    : isBuildScheduledOn(facts.startDate, facts.scheduleVersions, date);
}

function forEachWeekDate(
  weekStart: CalendarDate,
  visit: (date: CalendarDate) => void
): void {
  assertCalendarDate(weekStart);
  for (let offset = 0; offset < 7; offset += 1) {
    visit(addDays(weekStart, offset));
  }
}

function weekday(date: CalendarDate): Weekday {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay() as Weekday;
}

function addDays(date: CalendarDate, amount: number): CalendarDate {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function assertCalendarDate(date: CalendarDate): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RangeError(`Invalid calendar date: ${date}`);
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError(`Invalid calendar date: ${date}`);
  }
}
