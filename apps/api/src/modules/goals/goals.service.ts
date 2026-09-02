import { and, asc, eq, lte } from "drizzle-orm";

import { db as applicationDb } from "../../db/database.js";
import {
  goals,
  habitLogs,
  habitScheduleDays,
  habitSchedules,
  habits,
} from "../../db/schema/index.js";
import { AppError, ERROR_CODES } from "../../lib/errors.js";
import { createId } from "../../lib/id.js";
import {
  calculateGoalSuccessfulDays,
  type ScheduleVersion,
  type Weekday,
} from "../habits/habit-calculations.js";
import type { CreateGoalInput, UpdateGoalInput } from "./goals.schema.js";

export type Goal = {
  id: string;
  habitId: string;
  targetSuccessfulDays: number;
  successfulDays: number;
  createdAt: Date;
  updatedAt: Date;
};

export interface GoalsServiceContract {
  list(userId: string, habitId: string): Promise<Goal[]>;
  create(
    userId: string,
    habitId: string,
    input: CreateGoalInput
  ): Promise<Goal>;
  update(
    userId: string,
    habitId: string,
    goalId: string,
    input: UpdateGoalInput
  ): Promise<Goal>;
  delete(userId: string, habitId: string, goalId: string): Promise<void>;
}

type Database = typeof applicationDb;

export class GoalsService implements GoalsServiceContract {
  constructor(
    private readonly database: Database = applicationDb,
    private readonly today: () => string = utcToday
  ) {}

  async list(userId: string, habitId: string): Promise<Goal[]> {
    const habit = await this.findOwnedHabit(userId, habitId);
    const today = this.today();
    const [goalRows, logRows, scheduleRows] = await Promise.all([
      this.database
        .select()
        .from(goals)
        .where(eq(goals.habitId, habitId))
        .orderBy(asc(goals.createdAt)),
      this.database
        .select({ date: habitLogs.date, eventType: habitLogs.eventType })
        .from(habitLogs)
        .where(and(eq(habitLogs.habitId, habitId), lte(habitLogs.date, today)))
        .orderBy(asc(habitLogs.date)),
      habit.type === "BUILD"
        ? this.database
            .select({
              effectiveFrom: habitSchedules.effectiveFrom,
              dayOfWeek: habitScheduleDays.dayOfWeek,
            })
            .from(habitSchedules)
            .innerJoin(
              habitScheduleDays,
              eq(habitScheduleDays.scheduleId, habitSchedules.id)
            )
            .where(
              and(
                eq(habitSchedules.habitId, habitId),
                lte(habitSchedules.effectiveFrom, today)
              )
            )
            .orderBy(
              asc(habitSchedules.effectiveFrom),
              asc(habitScheduleDays.dayOfWeek)
            )
        : Promise.resolve([]),
    ]);
    const successfulDays =
      habit.type === "BUILD"
        ? calculateGoalSuccessfulDays({
            type: "BUILD",
            startDate: habit.startDate,
            scheduleVersions: toScheduleVersions(scheduleRows),
            completionDates: logRows
              .filter(({ eventType }) => eventType === "COMPLETION")
              .map(({ date }) => date),
            today,
          })
        : calculateGoalSuccessfulDays({
            type: "BREAK",
            startDate: habit.startDate,
            relapseDates: logRows
              .filter(({ eventType }) => eventType === "RELAPSE")
              .map(({ date }) => date),
            today,
          });
    return goalRows.map((goal) => ({ ...goal, successfulDays }));
  }

  async create(
    userId: string,
    habitId: string,
    input: CreateGoalInput
  ): Promise<Goal> {
    await this.findOwnedHabit(userId, habitId);
    const id = createId();
    await this.database.insert(goals).values({ id, habitId, ...input });
    return this.findWithProgress(userId, habitId, id);
  }

  async update(
    userId: string,
    habitId: string,
    goalId: string,
    input: UpdateGoalInput
  ): Promise<Goal> {
    await this.findOwnedGoal(userId, habitId, goalId);
    await this.database
      .update(goals)
      .set(input)
      .where(and(eq(goals.id, goalId), eq(goals.habitId, habitId)));
    return this.findWithProgress(userId, habitId, goalId);
  }

  async delete(userId: string, habitId: string, goalId: string): Promise<void> {
    await this.findOwnedGoal(userId, habitId, goalId);
    await this.database
      .delete(goals)
      .where(and(eq(goals.id, goalId), eq(goals.habitId, habitId)));
  }

  private async findWithProgress(
    userId: string,
    habitId: string,
    goalId: string
  ) {
    const listed = await this.list(userId, habitId);
    const goal = listed.find(({ id }) => id === goalId);
    if (!goal) goalNotFound();
    return goal;
  }

  private async findOwnedHabit(userId: string, habitId: string) {
    const [habit] = await this.database
      .select({
        id: habits.id,
        type: habits.type,
        startDate: habits.startDate,
      })
      .from(habits)
      .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
      .limit(1);
    if (!habit) throw new AppError(ERROR_CODES.HABIT_NOT_FOUND);
    return habit;
  }

  private async findOwnedGoal(userId: string, habitId: string, goalId: string) {
    await this.findOwnedHabit(userId, habitId);
    const [goal] = await this.database
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.habitId, habitId)))
      .limit(1);
    if (!goal) goalNotFound();
    return goal;
  }
}

function toScheduleVersions(
  rows: readonly { effectiveFrom: string; dayOfWeek: number }[]
): ScheduleVersion[] {
  const versions = new Map<string, Weekday[]>();
  for (const row of rows) {
    const days = versions.get(row.effectiveFrom) ?? [];
    days.push(row.dayOfWeek as Weekday);
    versions.set(row.effectiveFrom, days);
  }
  return [...versions].map(([effectiveFrom, days]) => ({
    effectiveFrom,
    days,
  }));
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function goalNotFound(): never {
  throw new AppError(ERROR_CODES.GOAL_NOT_FOUND);
}
