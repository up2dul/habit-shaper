import { describe, expect, it, vi } from "vitest";

import { GoalsService } from "./goals.service.js";

const goal = {
  id: "goal-1",
  habitId: "habit-1",
  targetSuccessfulDays: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GoalsService", () => {
  it("rejects cross-user access before listing goals", async () => {
    const database = listDatabase([], [], [], []);
    const service = new GoalsService(database as never, () => "2026-09-04");
    await expect(service.list("other-user", "habit-1")).rejects.toMatchObject({
      code: "HABIT_NOT_FOUND",
    });
    expect(database.select).toHaveBeenCalledOnce();
  });

  it("derives BUILD progress from completed scheduled days", async () => {
    const database = listDatabase(
      [{ type: "BUILD", startDate: "2026-09-01" }],
      [goal],
      [
        { date: "2026-09-01", eventType: "COMPLETION" },
        { date: "2026-09-02", eventType: "COMPLETION" },
        { date: "2026-09-03", eventType: "COMPLETION" },
      ],
      [
        { effectiveFrom: "2026-09-01", dayOfWeek: 2 },
        { effectiveFrom: "2026-09-01", dayOfWeek: 3 },
      ]
    );
    const service = new GoalsService(database as never, () => "2026-09-04");
    await expect(service.list("user-1", "habit-1")).resolves.toEqual([
      expect.objectContaining({ id: "goal-1", successfulDays: 2 }),
    ]);
  });

  it("derives BREAK progress from clean calendar days", async () => {
    const database = listDatabase(
      [{ type: "BREAK", startDate: "2026-09-01" }],
      [goal],
      [{ date: "2026-09-02", eventType: "RELAPSE" }],
      []
    );
    const service = new GoalsService(database as never, () => "2026-09-04");
    await expect(service.list("user-1", "habit-1")).resolves.toEqual([
      expect.objectContaining({ id: "goal-1", successfulDays: 3 }),
    ]);
  });
});

function listDatabase(
  habitRows: unknown[],
  goalRows: unknown[],
  logRows: unknown[],
  scheduleRows: unknown[]
) {
  let selectCount = 0;
  const rows = [habitRows, goalRows, logRows, scheduleRows];
  return {
    select: vi.fn(() => {
      const selected = rows[selectCount++] ?? [];
      const orderBy = vi.fn().mockResolvedValue(selected);
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue(selected),
            orderBy,
          })),
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({ orderBy })),
          })),
        })),
      };
    }),
  };
}
