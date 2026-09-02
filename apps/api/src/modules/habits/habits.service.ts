import { and, asc, eq, inArray, lte } from "drizzle-orm";

import { db as applicationDb } from "../../db/database.js";
import {
  habitScheduleDays,
  habitSchedules,
  habitLogs,
  habits,
} from "../../db/schema/index.js";
import { AppError, ERROR_CODES } from "../../lib/errors.js";
import { createId } from "../../lib/id.js";
import {
  calculateBreakStreak,
  calculateBreakWeeklySummary,
  calculateBuildStreak,
  calculateBuildWeeklySummary,
  calculateGoalSuccessfulDays,
  isHistoryDateEditable,
  isBuildScheduledOn,
  resolveBreakDayState,
  resolveBuildDayState,
  resolveEffectiveSchedule,
  type ScheduleVersion,
  type Weekday as ScheduleWeekday,
} from "./habit-calculations.js";
import type {
  CreateHabitInput,
  HabitHistoryQuery,
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

export type TodayHabit = Pick<
  Habit,
  "id" | "name" | "description" | "type" | "startDate"
> & {
  state: "COMPLETED" | "PENDING" | "CLEAN" | "RELAPSE";
  streak: number;
  scheduleDays: Weekday[];
};

export type HistoryHabit = Pick<Habit, "id" | "name" | "type" | "startDate"> & {
  streak: number;
  successfulDays: number;
  weekly:
    | {
        type: "BUILD";
        completed: number;
        missed: number;
        pending: number;
        completionRate: number | null;
      }
    | { type: "BREAK"; clean: number; relapse: number };
  days: Array<{
    date: string;
    state:
      | "COMPLETED"
      | "MISSED"
      | "PENDING"
      | "CLEAN"
      | "RELAPSE"
      | "NOT_APPLICABLE";
    editable: boolean;
  }>;
};

export type HabitHistory = {
  month: string;
  today: string;
  habits: HistoryHabit[];
};

export interface HabitsServiceContract {
  list(userId: string): Promise<Habit[]>;
  listToday(userId: string): Promise<TodayHabit[]>;
  history(userId: string, query: HabitHistoryQuery): Promise<HabitHistory>;
  create(userId: string, input: CreateHabitInput): Promise<Habit>;
  get(userId: string, habitId: string): Promise<Habit>;
  update(
    userId: string,
    habitId: string,
    input: UpdateHabitInput
  ): Promise<Habit>;
  delete(userId: string, habitId: string): Promise<void>;
  setCompletion(
    userId: string,
    habitId: string,
    date: string,
    completed: boolean
  ): Promise<void>;
  setRelapse(
    userId: string,
    habitId: string,
    date: string,
    relapsed: boolean
  ): Promise<void>;
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

  async listToday(userId: string): Promise<TodayHabit[]> {
    const today = this.today();
    const records = await this.database
      .select()
      .from(habits)
      .where(and(eq(habits.userId, userId), lte(habits.startDate, today)))
      .orderBy(asc(habits.createdAt));
    if (records.length === 0) return [];

    const habitIds = records.map(({ id }) => id);
    const [scheduleRows, logRows] = await Promise.all([
      this.database
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
          and(
            inArray(habitSchedules.habitId, habitIds),
            lte(habitSchedules.effectiveFrom, today)
          )
        )
        .orderBy(
          asc(habitSchedules.effectiveFrom),
          asc(habitScheduleDays.dayOfWeek)
        ),
      this.database
        .select({
          habitId: habitLogs.habitId,
          date: habitLogs.date,
          eventType: habitLogs.eventType,
        })
        .from(habitLogs)
        .where(
          and(inArray(habitLogs.habitId, habitIds), lte(habitLogs.date, today))
        )
        .orderBy(asc(habitLogs.date)),
    ]);

    return records.flatMap((record): TodayHabit[] => {
      const schedules = scheduleVersionsFor(record.id, scheduleRows);
      const logs = logRows.filter((log) => log.habitId === record.id);
      if (
        record.type === "BUILD" &&
        !isBuildScheduledOn(record.startDate, schedules, today)
      ) {
        return [];
      }
      const base = {
        id: record.id,
        name: record.name,
        description: record.description,
        type: record.type,
        startDate: record.startDate,
        scheduleDays:
          resolveEffectiveSchedule(schedules, today)?.days.slice() ?? [],
      };
      if (record.type === "BUILD") {
        const completionDates = logs
          .filter(({ eventType }) => eventType === "COMPLETION")
          .map(({ date }) => date);
        const facts = {
          startDate: record.startDate,
          scheduleVersions: schedules,
          completionDates,
          today,
        };
        const state = resolveBuildDayState(facts, today);
        return [
          {
            ...base,
            type: "BUILD",
            state: state === "COMPLETED" ? "COMPLETED" : "PENDING",
            streak: calculateBuildStreak(facts),
          },
        ];
      }
      const relapseDates = logs
        .filter(({ eventType }) => eventType === "RELAPSE")
        .map(({ date }) => date);
      const facts = { startDate: record.startDate, relapseDates, today };
      return [
        {
          ...base,
          type: "BREAK",
          state:
            resolveBreakDayState(facts, today) === "RELAPSE"
              ? "RELAPSE"
              : "CLEAN",
          streak: calculateBreakStreak(facts),
        },
      ];
    });
  }

  async history(
    userId: string,
    query: HabitHistoryQuery
  ): Promise<HabitHistory> {
    const today = this.today();
    const monthStart = `${query.month}-01`;
    const monthEnd = endOfMonth(monthStart);
    const records = await this.database
      .select()
      .from(habits)
      .where(
        and(
          eq(habits.userId, userId),
          ...(query.habitId ? [eq(habits.id, query.habitId)] : [])
        )
      )
      .orderBy(asc(habits.createdAt));
    if (query.habitId && records.length === 0) notFound();
    if (records.length === 0) return { month: query.month, today, habits: [] };

    const habitIds = records.map(({ id }) => id);
    const [scheduleRows, logRows] = await Promise.all([
      this.database
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
          and(
            inArray(habitSchedules.habitId, habitIds),
            lte(habitSchedules.effectiveFrom, maxDate(today, monthEnd))
          )
        )
        .orderBy(
          asc(habitSchedules.effectiveFrom),
          asc(habitScheduleDays.dayOfWeek)
        ),
      this.database
        .select({
          habitId: habitLogs.habitId,
          date: habitLogs.date,
          eventType: habitLogs.eventType,
        })
        .from(habitLogs)
        .where(
          and(inArray(habitLogs.habitId, habitIds), lte(habitLogs.date, today))
        )
        .orderBy(asc(habitLogs.date)),
    ]);
    const dates = monthDates(monthStart, monthEnd);
    const weekStart = startOfWeek(today);

    return {
      month: query.month,
      today,
      habits: records.map((record): HistoryHabit => {
        const schedules = scheduleVersionsFor(record.id, scheduleRows);
        const logs = logRows.filter(({ habitId }) => habitId === record.id);
        if (record.type === "BUILD") {
          const completionDates = logs
            .filter(({ eventType }) => eventType === "COMPLETION")
            .map(({ date }) => date);
          const facts = {
            startDate: record.startDate,
            scheduleVersions: schedules,
            completionDates,
            today,
          };
          return {
            id: record.id,
            name: record.name,
            type: "BUILD",
            startDate: record.startDate,
            streak: calculateBuildStreak(facts),
            successfulDays: calculateGoalSuccessfulDays({
              type: "BUILD",
              ...facts,
            }),
            weekly: {
              type: "BUILD",
              ...calculateBuildWeeklySummary(facts, weekStart),
            },
            days: dates.map((date) => ({
              date,
              state: resolveBuildDayState(facts, date),
              editable: isHistoryDateEditable(
                {
                  type: "BUILD",
                  startDate: record.startDate,
                  scheduleVersions: schedules,
                  today,
                },
                date
              ),
            })),
          };
        }
        const relapseDates = logs
          .filter(({ eventType }) => eventType === "RELAPSE")
          .map(({ date }) => date);
        const facts = { startDate: record.startDate, relapseDates, today };
        return {
          id: record.id,
          name: record.name,
          type: "BREAK",
          startDate: record.startDate,
          streak: calculateBreakStreak(facts),
          successfulDays: calculateGoalSuccessfulDays({
            type: "BREAK",
            ...facts,
          }),
          weekly: {
            type: "BREAK",
            ...calculateBreakWeeklySummary(facts, weekStart),
          },
          days: dates.map((date) => ({
            date,
            state: resolveBreakDayState(facts, date),
            editable: isHistoryDateEditable(
              { type: "BREAK", startDate: record.startDate, today },
              date
            ),
          })),
        };
      }),
    };
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
      throw new AppError(ERROR_CODES.BREAK_HABIT_SCHEDULE_NOT_ALLOWED);
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

  async setCompletion(
    userId: string,
    habitId: string,
    date: string,
    completed: boolean
  ): Promise<void> {
    const record = await this.validateLogMutation(
      userId,
      habitId,
      date,
      "BUILD"
    );
    const schedules = await this.loadScheduleVersions(habitId);
    if (!isBuildScheduledOn(record.startDate, schedules, date)) {
      throw new AppError(ERROR_CODES.BUILD_DATE_NOT_SCHEDULED);
    }
    await this.persistLog(habitId, date, "COMPLETION", completed);
  }

  async setRelapse(
    userId: string,
    habitId: string,
    date: string,
    relapsed: boolean
  ): Promise<void> {
    await this.validateLogMutation(userId, habitId, date, "BREAK");
    await this.persistLog(habitId, date, "RELAPSE", relapsed);
  }

  private async validateLogMutation(
    userId: string,
    habitId: string,
    date: string,
    expectedType: "BUILD" | "BREAK"
  ) {
    const record = await this.findOwned(userId, habitId);
    if (record.type !== expectedType) {
      throw new AppError(
        ERROR_CODES.HABIT_EVENT_TYPE_MISMATCH,
        `This action is only valid for ${expectedType.toLowerCase()} habits`
      );
    }
    if (date < record.startDate) {
      throw new AppError(ERROR_CODES.HABIT_DATE_BEFORE_START);
    }
    if (date > this.today()) {
      throw new AppError(ERROR_CODES.HABIT_DATE_IN_FUTURE);
    }
    return record;
  }

  private async persistLog(
    habitId: string,
    date: string,
    eventType: "COMPLETION" | "RELAPSE",
    present: boolean
  ): Promise<void> {
    if (present) {
      await this.database
        .insert(habitLogs)
        .values({ id: createId(), habitId, date, eventType })
        .onDuplicateKeyUpdate({ set: { eventType } });
      return;
    }
    await this.database
      .delete(habitLogs)
      .where(
        and(
          eq(habitLogs.habitId, habitId),
          eq(habitLogs.date, date),
          eq(habitLogs.eventType, eventType)
        )
      );
  }

  private async loadScheduleVersions(
    habitId: string
  ): Promise<ScheduleVersion[]> {
    const rows = await this.database
      .select({
        effectiveFrom: habitSchedules.effectiveFrom,
        dayOfWeek: habitScheduleDays.dayOfWeek,
      })
      .from(habitSchedules)
      .innerJoin(
        habitScheduleDays,
        eq(habitScheduleDays.scheduleId, habitSchedules.id)
      )
      .where(eq(habitSchedules.habitId, habitId))
      .orderBy(
        asc(habitSchedules.effectiveFrom),
        asc(habitScheduleDays.dayOfWeek)
      );
    return scheduleVersionsFor(
      habitId,
      rows.map((row) => ({ ...row, habitId }))
    );
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

function scheduleVersionsFor(
  habitId: string,
  rows: readonly { habitId: string; effectiveFrom: string; dayOfWeek: number }[]
): ScheduleVersion[] {
  const versions = new Map<string, ScheduleWeekday[]>();
  for (const row of rows) {
    if (row.habitId !== habitId) continue;
    const days = versions.get(row.effectiveFrom) ?? [];
    days.push(row.dayOfWeek as ScheduleWeekday);
    versions.set(row.effectiveFrom, days);
  }
  return [...versions].map(([effectiveFrom, days]) => ({
    effectiveFrom,
    days,
  }));
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

function endOfMonth(monthStart: string): string {
  const date = new Date(`${monthStart}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

function monthDates(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let date = start; date <= end; date = shiftDate(date, 1))
    dates.push(date);
  return dates;
}

function startOfWeek(date: string): string {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return shiftDate(date, weekday === 0 ? -6 : 1 - weekday);
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function notFound(): never {
  throw new AppError(ERROR_CODES.HABIT_NOT_FOUND);
}
