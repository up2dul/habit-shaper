const DAY_MS = 24 * 60 * 60 * 1_000;

export const DEMO_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Demo User",
  email: "demo@example.com",
  password: "demo12345",
} as const;

const EXERCISE_HABIT_ID = "00000000-0000-4000-8000-000000000002";
const NO_SUGARY_DRINKS_HABIT_ID = "00000000-0000-4000-8000-000000000003";
const EXERCISE_SCHEDULE_ID = "00000000-0000-4000-8000-000000000004";
const EXERCISE_GOAL_ID = "00000000-0000-4000-8000-000000000005";
const NO_SUGARY_DRINKS_GOAL_ID = "00000000-0000-4000-8000-000000000006";
const EXERCISE_LOG_IDS = [
  "00000000-0000-4000-8000-000000000010",
  "00000000-0000-4000-8000-000000000011",
  "00000000-0000-4000-8000-000000000012",
  "00000000-0000-4000-8000-000000000013",
  "00000000-0000-4000-8000-000000000014",
] as const;
const RELAPSE_LOG_ID = "00000000-0000-4000-8000-000000000020";

export type SeedFixture = ReturnType<typeof buildSeedFixture>;

export function assertSeedAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv === "production") {
    throw new Error("Refusing to seed a production database");
  }
}

export function buildSeedFixture(now: Date = new Date()) {
  const today = startOfUtcDay(now);
  const startDate = addUtcDays(today, -14);
  const activityDates = Array.from({ length: 14 }, (_, index) =>
    addUtcDays(startDate, index)
  );
  const scheduledExerciseDates = activityDates.filter((date) =>
    [1, 3, 5].includes(date.getUTCDay())
  );
  const missedExerciseDate =
    scheduledExerciseDates.at(-2) ?? scheduledExerciseDates.at(-1);
  const completedExerciseDates = scheduledExerciseDates.filter(
    (date) => date.getTime() !== missedExerciseDate?.getTime()
  );

  return {
    user: DEMO_USER,
    habits: [
      {
        id: EXERCISE_HABIT_ID,
        userId: DEMO_USER.id,
        name: "Exercise",
        description: "Move for at least 30 minutes.",
        type: "BUILD" as const,
        startDate: formatUtcDate(startDate),
      },
      {
        id: NO_SUGARY_DRINKS_HABIT_ID,
        userId: DEMO_USER.id,
        name: "No sugary drinks",
        description: "Choose water or an unsweetened drink.",
        type: "BREAK" as const,
        startDate: formatUtcDate(startDate),
      },
    ],
    schedule: {
      id: EXERCISE_SCHEDULE_ID,
      habitId: EXERCISE_HABIT_ID,
      effectiveFrom: formatUtcDate(startDate),
      days: [1, 3, 5],
    },
    goals: [
      {
        id: EXERCISE_GOAL_ID,
        habitId: EXERCISE_HABIT_ID,
        targetSuccessfulDays: 30,
      },
      {
        id: NO_SUGARY_DRINKS_GOAL_ID,
        habitId: NO_SUGARY_DRINKS_HABIT_ID,
        targetSuccessfulDays: 14,
      },
    ],
    logs: [
      ...completedExerciseDates.map((date, index) => ({
        id: EXERCISE_LOG_IDS[index]!,
        habitId: EXERCISE_HABIT_ID,
        date: formatUtcDate(date),
        eventType: "COMPLETION" as const,
      })),
      {
        id: RELAPSE_LOG_ID,
        habitId: NO_SUGARY_DRINKS_HABIT_ID,
        date: formatUtcDate(addUtcDays(today, -4)),
        eventType: "RELAPSE" as const,
      },
    ],
    missedExerciseDate: missedExerciseDate
      ? formatUtcDate(missedExerciseDate)
      : undefined,
  };
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
