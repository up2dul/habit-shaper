import { describe, expect, it } from "vitest";

import {
  assertSeedAllowed,
  buildSeedFixture,
  DEMO_USER,
} from "./seed-fixture.js";

describe("buildSeedFixture", () => {
  it("builds a stable rolling demo fixture", () => {
    const fixture = buildSeedFixture(new Date("2026-09-03T23:45:00Z"));

    expect(fixture.user).toEqual(DEMO_USER);
    expect(fixture.habits).toEqual([
      expect.objectContaining({
        name: "Exercise",
        type: "BUILD",
        startDate: "2026-08-20",
      }),
      expect.objectContaining({
        name: "No sugary drinks",
        type: "BREAK",
        startDate: "2026-08-20",
      }),
    ]);
    expect(fixture.schedule.days).toEqual([1, 3, 5]);
    expect(fixture.goals.map((goal) => goal.targetSuccessfulDays)).toEqual([
      30, 14,
    ]);
    expect(fixture.missedExerciseDate).toBe("2026-08-31");
    expect(fixture.logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: "2026-08-30",
          eventType: "RELAPSE",
        }),
      ])
    );
  });

  it("creates completions only for scheduled weekdays and omits the miss", () => {
    const fixture = buildSeedFixture(new Date("2026-09-03T00:00:00Z"));
    const completions = fixture.logs.filter(
      (log) => log.eventType === "COMPLETION"
    );

    expect(completions).toHaveLength(5);
    expect(completions.map((log) => log.date)).not.toContain(
      fixture.missedExerciseDate
    );
    expect(
      completions.every((log) =>
        [1, 3, 5].includes(new Date(`${log.date}T00:00:00Z`).getUTCDay())
      )
    ).toBe(true);
  });
});

describe("assertSeedAllowed", () => {
  it("rejects production", () => {
    expect(() => assertSeedAllowed("production")).toThrow(
      "Refusing to seed a production database"
    );
  });

  it.each([undefined, "development", "test"])("allows %s", (nodeEnv) => {
    expect(() => assertSeedAllowed(nodeEnv)).not.toThrow();
  });
});
