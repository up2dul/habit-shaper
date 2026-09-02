import { getTableConfig } from "drizzle-orm/mysql-core";
import { describe, expect, it } from "vitest";

import {
  goals,
  habitLogs,
  habitScheduleDays,
  habitSchedules,
  habits,
  sessions,
  users,
} from "./index.js";

describe("database schema", () => {
  it("defines the required access paths and uniqueness rules", () => {
    expect(indexNames(users)).toContain("users_email_unique");
    expect(indexNames(sessions)).toEqual(
      expect.arrayContaining([
        "sessions_user_id_idx",
        "sessions_expires_at_idx",
      ])
    );
    expect(indexNames(habits)).toContain("habits_user_id_idx");
    expect(indexNames(habitSchedules)).toContain(
      "habit_schedules_habit_effective_unique"
    );
    expect(indexNames(habitLogs)).toContain("habit_logs_habit_date_unique");
    expect(indexNames(goals)).toContain("goals_habit_id_idx");
  });

  it("cascades every habit-owned relationship", () => {
    for (const table of [habitSchedules, habitLogs, goals]) {
      expect(getTableConfig(table).foreignKeys[0]?.onDelete).toBe("cascade");
    }

    expect(getTableConfig(habitScheduleDays).foreignKeys[0]?.onDelete).toBe(
      "cascade"
    );
  });

  it("constrains weekdays and positive goal targets", () => {
    expect(checkNames(habitScheduleDays)).toContain(
      "habit_schedule_days_day_of_week_check"
    );
    expect(checkNames(goals)).toContain("goals_target_successful_days_check");
  });

  it("limits habit and event types to the supported model", () => {
    expect(habits.type.enumValues).toEqual(["BUILD", "BREAK"]);
    expect(habitLogs.eventType.enumValues).toEqual(["COMPLETION", "RELAPSE"]);
  });
});

function indexNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).indexes.map((item) => item.config.name);
}

function checkNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).checks.map((item) => item.name);
}
