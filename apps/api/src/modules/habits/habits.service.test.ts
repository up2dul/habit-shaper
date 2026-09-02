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
});
