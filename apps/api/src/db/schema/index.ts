import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  timestamp,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: varchar({ length: 100 }).notNull(),
    email: varchar({ length: 320 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    check(
      "users_name_trimmed_nonempty_check",
      sql`${table.name} = trim(${table.name}) and char_length(${table.name}) >= 1`
    ),
  ]
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar({ length: 128 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ]
);

export const habits = mysqlTable(
  "habits",
  {
    id: varchar({ length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    type: mysqlEnum(["BUILD", "BREAK"]).notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("habits_user_id_idx").on(table.userId)]
);

export const habitSchedules = mysqlTable(
  "habit_schedules",
  {
    id: varchar({ length: 36 }).primaryKey(),
    habitId: varchar("habit_id", { length: 36 })
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("habit_schedules_habit_effective_unique").on(
      table.habitId,
      table.effectiveFrom
    ),
  ]
);

export const habitScheduleDays = mysqlTable(
  "habit_schedule_days",
  {
    scheduleId: varchar("schedule_id", { length: 36 })
      .notNull()
      .references(() => habitSchedules.id, { onDelete: "cascade" }),
    dayOfWeek: int("day_of_week").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scheduleId, table.dayOfWeek] }),
    check(
      "habit_schedule_days_day_of_week_check",
      sql`${table.dayOfWeek} between 0 and 6`
    ),
  ]
);

export const habitLogs = mysqlTable(
  "habit_logs",
  {
    id: varchar({ length: 36 }).primaryKey(),
    habitId: varchar("habit_id", { length: 36 })
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: date({ mode: "string" }).notNull(),
    eventType: mysqlEnum("event_type", ["COMPLETION", "RELAPSE"]).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("habit_logs_habit_date_unique").on(table.habitId, table.date),
  ]
);

export const goals = mysqlTable(
  "goals",
  {
    id: varchar({ length: 36 }).primaryKey(),
    habitId: varchar("habit_id", { length: 36 })
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    targetSuccessfulDays: int("target_successful_days").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("goals_habit_id_idx").on(table.habitId),
    check(
      "goals_target_successful_days_check",
      sql`${table.targetSuccessfulDays} > 0`
    ),
  ]
);
