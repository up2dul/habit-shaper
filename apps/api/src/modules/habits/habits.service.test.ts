import { describe, expect, it, vi } from "vitest";

import {
  habitScheduleDays,
  habitSchedules,
  habits,
} from "../../db/schema/index.js";
import { HabitsService } from "./habits.service.js";

function transactionDatabase() {
  const writes: Array<{ table: unknown; values: unknown }> = [];
  const transaction = {
    insert: vi.fn((table: unknown) => ({
      values: vi.fn(async (values: unknown) => {
        writes.push({ table, values });
      }),
    })),
  };
  const database = {
    transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) =>
      callback(transaction)
    ),
  };
  return { database, writes };
}

describe("HabitsService", () => {
  it("persists a BUILD habit and its schedule in one transaction", async () => {
    const { database, writes } = transactionDatabase();
    const service = new HabitsService(database as never);
    vi.spyOn(service, "get").mockResolvedValue({} as never);
    await service.create("user-1", {
      name: "Read",
      type: "BUILD",
      startDate: "2026-09-02",
      scheduleDays: [1, 3, 5],
    });
    expect(database.transaction).toHaveBeenCalledOnce();
    expect(writes.map(({ table }) => table)).toEqual([
      habits,
      habitSchedules,
      habitScheduleDays,
    ]);
    expect(writes[2]?.values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dayOfWeek: 1 }),
        expect.objectContaining({ dayOfWeek: 3 }),
        expect.objectContaining({ dayOfWeek: 5 }),
      ])
    );
  });

  it("does not create schedule rows for a BREAK habit", async () => {
    const { database, writes } = transactionDatabase();
    const service = new HabitsService(database as never);
    vi.spyOn(service, "get").mockResolvedValue({} as never);
    await service.create("user-1", {
      name: "No sugar",
      type: "BREAK",
      startDate: "2026-09-02",
    });
    expect(writes).toHaveLength(1);
    expect(writes[0]?.table).toBe(habits);
  });

  it("rolls the habit back when schedule persistence fails", async () => {
    let insertCount = 0;
    const transaction = {
      insert: vi.fn(() => ({
        values: vi.fn(async () => {
          insertCount += 1;
          if (insertCount === 3) throw new Error("schedule days failed");
        }),
      })),
    };
    const database = {
      transaction: vi.fn(
        async (callback: (tx: typeof transaction) => unknown) =>
          callback(transaction)
      ),
    };
    const service = new HabitsService(database as never);
    await expect(
      service.create("user-1", {
        name: "Read",
        type: "BUILD",
        startDate: "2026-09-02",
        scheduleDays: [1],
      })
    ).rejects.toThrow("schedule days failed");
    expect(database.transaction).toHaveBeenCalledOnce();
  });

  it("writes schedule edits as a new effective version", async () => {
    const existing = {
      id: "habit-1",
      userId: "user-1",
      name: "Read",
      description: null,
      type: "BUILD" as const,
      startDate: "2026-08-01",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const writes: Array<{ table: unknown; values: unknown }> = [];
    const transaction = {
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
        })),
      })),
      insert: vi.fn((table: unknown) => ({
        values: vi.fn(async (values: unknown) => {
          writes.push({ table, values });
        }),
      })),
    };
    const database = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([existing]),
          })),
        })),
      })),
      transaction: vi.fn(
        async (callback: (tx: typeof transaction) => unknown) =>
          callback(transaction)
      ),
    };
    const service = new HabitsService(database as never, () => "2026-09-02");
    vi.spyOn(service, "get").mockResolvedValue({} as never);

    await service.update("user-1", "habit-1", { scheduleDays: [2, 4] });

    expect(writes.map(({ table }) => table)).toEqual([
      habitSchedules,
      habitScheduleDays,
    ]);
    expect(writes[0]?.values).toEqual(
      expect.objectContaining({ effectiveFrom: "2026-09-02" })
    );
    expect(transaction.delete).toBeUndefined();
  });

  it("rejects a completion for the wrong habit type", async () => {
    const database = ownedHabitDatabase({ type: "BREAK" });
    const service = new HabitsService(database as never, () => "2026-09-02");
    await expect(
      service.setCompletion("user-1", "habit-1", "2026-09-02", true)
    ).rejects.toMatchObject({ code: "HABIT_EVENT_TYPE_MISMATCH" });
  });

  it("rejects pre-start and future tracking dates", async () => {
    const database = ownedHabitDatabase({ startDate: "2026-09-01" });
    const service = new HabitsService(database as never, () => "2026-09-02");
    await expect(
      service.setRelapse("user-1", "habit-1", "2026-08-31", true)
    ).rejects.toMatchObject({ code: "HABIT_DATE_BEFORE_START" });
    await expect(
      service.setRelapse("user-1", "habit-1", "2026-09-03", true)
    ).rejects.toMatchObject({ code: "HABIT_DATE_IN_FUTURE" });
  });

  it("enforces ownership before changing tracking facts", async () => {
    const database = ownedHabitDatabase(null);
    const service = new HabitsService(database as never, () => "2026-09-02");
    await expect(
      service.setRelapse("other-user", "habit-1", "2026-09-02", true)
    ).rejects.toMatchObject({ code: "HABIT_NOT_FOUND" });
  });

  it("rejects completions on unscheduled BUILD dates", async () => {
    const database = trackingDatabase([
      { effectiveFrom: "2026-09-01", dayOfWeek: 1 },
    ]);
    const service = new HabitsService(database as never, () => "2026-09-02");
    await expect(
      service.setCompletion("user-1", "habit-1", "2026-09-02", true)
    ).rejects.toMatchObject({ code: "BUILD_DATE_NOT_SCHEDULED" });
  });

  it("uses duplicate-safe writes and idempotent deletes", async () => {
    const database = trackingDatabase([
      { effectiveFrom: "2026-09-01", dayOfWeek: 3 },
    ]);
    const service = new HabitsService(database as never, () => "2026-09-02");
    await service.setCompletion("user-1", "habit-1", "2026-09-02", true);
    await service.setCompletion("user-1", "habit-1", "2026-09-02", false);
    expect(database.onDuplicateKeyUpdate).toHaveBeenCalledWith({
      set: { eventType: "COMPLETION" },
    });
    expect(database.deleteWhere).toHaveBeenCalledOnce();
  });
});

function habitRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "habit-1",
    userId: "user-1",
    name: "Habit",
    description: null,
    type: "BREAK" as const,
    startDate: "2026-09-01",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function ownedHabitDatabase(overrides: Record<string, unknown> | null) {
  const record = overrides === null ? [] : [habitRecord(overrides)];
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue(record) })),
      })),
    })),
  };
}

function trackingDatabase(
  scheduleRows: Array<{ effectiveFrom: string; dayOfWeek: number }>
) {
  let selectCount = 0;
  const onDuplicateKeyUpdate = vi.fn().mockResolvedValue(undefined);
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  return {
    onDuplicateKeyUpdate,
    deleteWhere,
    select: vi.fn(() => {
      selectCount += 1;
      if (selectCount % 2 === 1) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi
                .fn()
                .mockResolvedValue([habitRecord({ type: "BUILD" })]),
            })),
          })),
        };
      }
      return {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue(scheduleRows),
            })),
          })),
        })),
      };
    }),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ onDuplicateKeyUpdate })),
    })),
    delete: vi.fn(() => ({ where: deleteWhere })),
  };
}
