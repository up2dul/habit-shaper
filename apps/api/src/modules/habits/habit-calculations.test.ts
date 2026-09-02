import { describe, expect, it } from "vitest";

import {
  calculateBreakStreak,
  calculateBreakWeeklySummary,
  calculateBuildStreak,
  calculateBuildWeeklySummary,
  calculateGoalSuccessfulDays,
  isBuildScheduledOn,
  isHistoryDateEditable,
  resolveBreakDayState,
  resolveBuildDayState,
  resolveEffectiveSchedule,
  type ScheduleVersion,
} from "./habit-calculations.js";

const weekdays: ScheduleVersion[] = [
  { effectiveFrom: "2026-08-01", days: [1, 3, 5] },
];

describe("schedule resolution", () => {
  it("selects the latest version effective on a historical date regardless of input order", () => {
    const versions: ScheduleVersion[] = [
      { effectiveFrom: "2026-09-07", days: [2, 4] },
      { effectiveFrom: "2026-08-01", days: [1, 3, 5] },
    ];
    expect(resolveEffectiveSchedule(versions, "2026-09-06")?.days).toEqual([
      1, 3, 5,
    ]);
    expect(resolveEffectiveSchedule(versions, "2026-09-08")?.days).toEqual([
      2, 4,
    ]);
  });

  it("returns no schedule before the first version", () => {
    expect(resolveEffectiveSchedule(weekdays, "2026-07-31")).toBeNull();
  });

  it("uses UTC weekdays without shifting the calendar date", () => {
    expect(isBuildScheduledOn("2026-08-01", weekdays, "2026-08-03")).toBe(true);
    expect(isBuildScheduledOn("2026-08-01", weekdays, "2026-08-04")).toBe(
      false
    );
  });

  it("does not schedule dates before the habit starts", () => {
    expect(isBuildScheduledOn("2026-08-05", weekdays, "2026-08-03")).toBe(
      false
    );
  });
});

describe("day states", () => {
  const build = {
    startDate: "2026-08-01",
    scheduleVersions: weekdays,
    completionDates: ["2026-08-31"],
    today: "2026-09-02",
  };

  it("resolves completed, missed, pending, and non-applicable BUILD dates", () => {
    expect(resolveBuildDayState(build, "2026-08-31")).toBe("COMPLETED");
    expect(resolveBuildDayState(build, "2026-08-28")).toBe("MISSED");
    expect(resolveBuildDayState(build, "2026-09-02")).toBe("PENDING");
    expect(resolveBuildDayState(build, "2026-09-01")).toBe("NOT_APPLICABLE");
    expect(resolveBuildDayState(build, "2026-09-04")).toBe("NOT_APPLICABLE");
  });

  it("derives yesterday as missed without a persisted row", () => {
    expect(
      resolveBuildDayState({ ...build, today: "2026-09-03" }, "2026-09-02")
    ).toBe("MISSED");
  });

  it("resolves clean, relapse, and non-applicable BREAK dates", () => {
    const facts = {
      startDate: "2026-09-01",
      relapseDates: ["2026-09-01"],
      today: "2026-09-02",
    };
    expect(resolveBreakDayState(facts, "2026-09-01")).toBe("RELAPSE");
    expect(resolveBreakDayState(facts, "2026-09-02")).toBe("CLEAN");
    expect(resolveBreakDayState(facts, "2026-08-31")).toBe("NOT_APPLICABLE");
    expect(resolveBreakDayState(facts, "2026-09-03")).toBe("NOT_APPLICABLE");
  });

  it("treats a future habit as non-applicable", () => {
    expect(
      resolveBuildDayState({ ...build, startDate: "2026-10-01" }, "2026-09-02")
    ).toBe("NOT_APPLICABLE");
  });
});

describe("streaks", () => {
  it("counts consecutive scheduled completions across week and month boundaries", () => {
    expect(
      calculateBuildStreak({
        startDate: "2026-08-01",
        scheduleVersions: weekdays,
        completionDates: ["2026-08-28", "2026-08-31", "2026-09-02"],
        today: "2026-09-02",
      })
    ).toBe(3);
  });

  it("does not let today's pending occurrence break a BUILD streak", () => {
    expect(
      calculateBuildStreak({
        startDate: "2026-08-01",
        scheduleVersions: weekdays,
        completionDates: ["2026-08-28", "2026-08-31"],
        today: "2026-09-02",
      })
    ).toBe(2);
  });

  it("stops at the latest missed scheduled occurrence", () => {
    expect(
      calculateBuildStreak({
        startDate: "2026-08-01",
        scheduleVersions: weekdays,
        completionDates: ["2026-08-28"],
        today: "2026-09-02",
      })
    ).toBe(0);
  });

  it("reflects BUILD history additions and removals", () => {
    const facts = {
      startDate: "2026-08-01",
      scheduleVersions: weekdays,
      today: "2026-09-02",
    };
    expect(
      calculateBuildStreak({
        ...facts,
        completionDates: ["2026-08-28", "2026-08-31"],
      })
    ).toBe(2);
    expect(
      calculateBuildStreak({ ...facts, completionDates: ["2026-08-28"] })
    ).toBe(0);
  });

  it("counts BREAK clean days from today back to the latest relapse", () => {
    expect(
      calculateBreakStreak({
        startDate: "2026-08-30",
        relapseDates: ["2026-08-31"],
        today: "2026-09-02",
      })
    ).toBe(2);
  });

  it("resets a BREAK streak on today's relapse", () => {
    expect(
      calculateBreakStreak({
        startDate: "2026-08-01",
        relapseDates: ["2026-09-02"],
        today: "2026-09-02",
      })
    ).toBe(0);
  });

  it("reflects BREAK history additions and removals", () => {
    const facts = { startDate: "2026-08-30", today: "2026-09-02" };
    expect(
      calculateBreakStreak({ ...facts, relapseDates: ["2026-09-01"] })
    ).toBe(1);
    expect(calculateBreakStreak({ ...facts, relapseDates: [] })).toBe(4);
  });
});

describe("weekly summaries", () => {
  it("summarizes BUILD outcomes and excludes pending today from the rate", () => {
    expect(
      calculateBuildWeeklySummary(
        {
          startDate: "2026-09-01",
          scheduleVersions: [
            { effectiveFrom: "2026-09-01", days: [1, 2, 3, 4, 5] },
          ],
          completionDates: ["2026-09-01"],
          today: "2026-09-02",
        },
        "2026-08-31"
      )
    ).toEqual({ completed: 1, missed: 0, pending: 1, completionRate: 1 });
  });

  it("calculates a BUILD completion rate from decided occurrences", () => {
    expect(
      calculateBuildWeeklySummary(
        {
          startDate: "2026-08-01",
          scheduleVersions: weekdays,
          completionDates: ["2026-08-31"],
          today: "2026-09-03",
        },
        "2026-08-31"
      )
    ).toEqual({ completed: 1, missed: 1, pending: 0, completionRate: 0.5 });
  });

  it("returns no BUILD rate when there are no decided occurrences", () => {
    expect(
      calculateBuildWeeklySummary(
        {
          startDate: "2026-10-01",
          scheduleVersions: weekdays,
          completionDates: [],
          today: "2026-09-02",
        },
        "2026-08-31"
      ).completionRate
    ).toBeNull();
  });

  it("summarizes only applicable BREAK dates in a partial week", () => {
    expect(
      calculateBreakWeeklySummary(
        {
          startDate: "2026-09-01",
          relapseDates: ["2026-09-02"],
          today: "2026-09-03",
        },
        "2026-08-31"
      )
    ).toEqual({ clean: 2, relapse: 1 });
  });
});

describe("goal progress and history", () => {
  it("counts only applicable BUILD completions once", () => {
    expect(
      calculateGoalSuccessfulDays({
        type: "BUILD",
        startDate: "2026-08-01",
        scheduleVersions: weekdays,
        completionDates: [
          "2026-08-31",
          "2026-08-31",
          "2026-09-01",
          "2026-09-04",
        ],
        today: "2026-09-02",
      })
    ).toBe(1);
  });

  it("counts each clean BREAK day through today", () => {
    expect(
      calculateGoalSuccessfulDays({
        type: "BREAK",
        startDate: "2026-08-30",
        relapseDates: ["2026-08-31"],
        today: "2026-09-02",
      })
    ).toBe(3);
  });

  it("allows BUILD corrections only on applicable non-future dates", () => {
    const facts = {
      type: "BUILD" as const,
      startDate: "2026-08-01",
      scheduleVersions: weekdays,
      today: "2026-09-02",
    };
    expect(isHistoryDateEditable(facts, "2026-08-31")).toBe(true);
    expect(isHistoryDateEditable(facts, "2026-09-01")).toBe(false);
    expect(isHistoryDateEditable(facts, "2026-09-04")).toBe(false);
  });

  it("allows BREAK corrections on every started non-future date", () => {
    const facts = {
      type: "BREAK" as const,
      startDate: "2026-09-01",
      today: "2026-09-02",
    };
    expect(isHistoryDateEditable(facts, "2026-09-01")).toBe(true);
    expect(isHistoryDateEditable(facts, "2026-08-31")).toBe(false);
    expect(isHistoryDateEditable(facts, "2026-09-03")).toBe(false);
  });

  it("preserves historical meaning when a schedule changes", () => {
    const versions: ScheduleVersion[] = [
      { effectiveFrom: "2026-08-01", days: [1] },
      { effectiveFrom: "2026-09-01", days: [2] },
    ];
    expect(isBuildScheduledOn("2026-08-01", versions, "2026-08-31")).toBe(true);
    expect(isBuildScheduledOn("2026-08-01", versions, "2026-09-01")).toBe(true);
    expect(isBuildScheduledOn("2026-08-01", versions, "2026-09-07")).toBe(
      false
    );
  });

  it("rejects impossible calendar dates", () => {
    expect(() => resolveEffectiveSchedule([], "2026-02-30")).toThrow(
      RangeError
    );
  });
});
