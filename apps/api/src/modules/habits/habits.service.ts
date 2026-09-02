import { and, asc, eq, inArray } from "drizzle-orm";

import { db as applicationDb } from "../../db/database.js";
import {
  habitScheduleDays,
  habitSchedules,
  habits,
} from "../../db/schema/index.js";
import { AppError } from "../../lib/app-error.js";
import { createId } from "../../lib/id.js";
import type {
  CreateHabitInput,
  UpdateHabitInput,
  Weekday,
} from "./habits.schema.js";

export type Habit = {
  id: string;
  name: string;
  description: string | null;
  type: "BUILD" | "BREAK";
  startDate: string;
  scheduleDays: Weekday[];
  createdAt: Date;
  updatedAt: Date;
};

export interface HabitsServiceContract {
  list(userId: string): Promise<Habit[]>;
  create(userId: string, input: CreateHabitInput): Promise<Habit>;
  get(userId: string, habitId: string): Promise<Habit>;
  update(
    userId: string,
    habitId: string,
    input: UpdateHabitInput
  ): Promise<Habit>;
  delete(userId: string, habitId: string): Promise<void>;
}

type Database = typeof applicationDb;
type HabitRecord = typeof habits.$inferSelect;

export class HabitsService implements HabitsServiceContract {
  constructor(
    private readonly database: Database = applicationDb,
    private readonly today: () => string = utcToday
  ) {}

  async list(userId: string): Promise<Habit[]> {
    const records = await this.database
      .select()
      .from(habits)
      .where(eq(habits.userId, userId))
      .orderBy(asc(habits.createdAt));

    if (records.length === 0) return [];
    const days = await this.loadEffectiveSchedules(records);
    return records.map((record) => toHabit(record, days.get(record.id) ?? []));
  }

  async create(userId: string, input: CreateHabitInput): Promise<Habit> {
    const id = createId();
    await this.database.transaction(async (transaction) => {
      await transaction.insert(habits).values({
        id,
        userId,
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        startDate: input.startDate,
      });

      if (input.type === "BUILD") {
        await writeSchedule(
          transaction,
          id,
          input.startDate,
          input.scheduleDays
        );
      }
    });
    return this.get(userId, id);
  }

  async get(userId: string, habitId: string): Promise<Habit> {
    const record = await this.findOwned(userId, habitId);
    const days = await this.loadEffectiveSchedules([record]);
    return toHabit(record, days.get(record.id) ?? []);
  }

  async update(
    userId: string,
    habitId: string,
    input: UpdateHabitInput
  ): Promise<Habit> {
    const existing = await this.findOwned(userId, habitId);
    if (existing.type === "BREAK" && input.scheduleDays) {
      throw new AppError(
        "BREAK_HABIT_SCHEDULE_NOT_ALLOWED",
        "Break habits cannot have a weekday schedule",
        400
      );
    }

    await this.database.transaction(async (transaction) => {
      const values = {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.description === undefined
          ? {}
          : { description: input.description }),
        ...(input.startDate === undefined
          ? {}
          : { startDate: input.startDate }),
      };
      if (Object.keys(values).length > 0) {
        await transaction
          .update(habits)
          .set(values)
          .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
      }

      if (existing.type === "BUILD" && input.scheduleDays) {
        const startDate = input.startDate ?? existing.startDate;
        const effectiveFrom = maxDate(this.today(), startDate);
        const [current] = await transaction
          .select({ id: habitSchedules.id })
          .from(habitSchedules)
          .where(
            and(
              eq(habitSchedules.habitId, habitId),
              eq(habitSchedules.effectiveFrom, effectiveFrom)
            )
          )
          .limit(1);

        if (current) {
          await transaction
            .delete(habitScheduleDays)
            .where(eq(habitScheduleDays.scheduleId, current.id));
          await transaction.insert(habitScheduleDays).values(
            input.scheduleDays.map((dayOfWeek) => ({
              scheduleId: current.id,
              dayOfWeek,
            }))
          );
        } else {
          await writeSchedule(
            transaction,
            habitId,
            effectiveFrom,
            input.scheduleDays
          );
        }
      }
    });
    return this.get(userId, habitId);
  }

  async delete(userId: string, habitId: string): Promise<void> {
    const result = await this.database
      .delete(habits)
      .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
    if (result[0].affectedRows === 0) notFound();
  }

  private async findOwned(userId: string, habitId: string) {
    const [record] = await this.database
      .select()
      .from(habits)
      .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
      .limit(1);
    if (!record) notFound();
    return record;
  }

  private async loadEffectiveSchedules(records: HabitRecord[]) {
    const buildRecords = records.filter((record) => record.type === "BUILD");
    const result = new Map<string, Weekday[]>();
    if (buildRecords.length === 0) return result;

    const rows = await this.database
      .select({
        habitId: habitSchedules.habitId,
        effectiveFrom: habitSchedules.effectiveFrom,
        dayOfWeek: habitScheduleDays.dayOfWeek,
      })
      .from(habitSchedules)
      .innerJoin(
        habitScheduleDays,
        eq(habitScheduleDays.scheduleId, habitSchedules.id)
      )
      .where(
        inArray(
          habitSchedules.habitId,
          buildRecords.map(({ id }) => id)
        )
      )
      .orderBy(
        asc(habitSchedules.effectiveFrom),
        asc(habitScheduleDays.dayOfWeek)
      );

    for (const record of buildRecords) {
      const effectiveDate = maxDate(this.today(), record.startDate);
      const versions = rows.filter(
        (row) => row.habitId === record.id && row.effectiveFrom <= effectiveDate
      );
      const latestDate = versions.at(-1)?.effectiveFrom;
      result.set(
        record.id,
        versions
          .filter((row) => row.effectiveFrom === latestDate)
          .map((row) => row.dayOfWeek as Weekday)
      );
    }
    return result;
  }
}

function toHabit(record: HabitRecord, scheduleDays: Weekday[]): Habit {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    type: record.type,
    startDate: record.startDate,
    scheduleDays,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function writeSchedule(
  transaction: Parameters<Parameters<Database["transaction"]>[0]>[0],
  habitId: string,
  effectiveFrom: string,
  days: Weekday[]
) {
  const scheduleId = createId();
  await transaction.insert(habitSchedules).values({
    id: scheduleId,
    habitId,
    effectiveFrom,
  });
  await transaction
    .insert(habitScheduleDays)
    .values(days.map((dayOfWeek) => ({ scheduleId, dayOfWeek })));
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function maxDate(left: string, right: string): string {
  return left > right ? left : right;
}

function notFound(): never {
  throw new AppError("HABIT_NOT_FOUND", "Habit not found", 404);
}
