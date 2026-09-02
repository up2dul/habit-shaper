import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../app.js";
import type { AuthServiceContract } from "../auth/auth.service.js";
import type { Habit, HabitsServiceContract } from "./habits.service.js";

const user = {
  id: "019caaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa",
  name: "A",
  email: "a@example.com",
};
const habit: Habit = {
  id: "019cbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb",
  name: "Read",
  description: null,
  type: "BUILD",
  startDate: "2026-09-02",
  scheduleDays: [1, 2, 3, 4, 5],
  createdAt: new Date("2026-09-02T00:00:00Z"),
  updatedAt: new Date("2026-09-02T00:00:00Z"),
};

function setup(authenticated = true) {
  const authService: AuthServiceContract = {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    authenticate: vi.fn().mockResolvedValue(authenticated ? user : null),
  };
  const methods = {
    list: vi.fn().mockResolvedValue([habit]),
    listToday: vi
      .fn()
      .mockResolvedValue([{ ...habit, state: "PENDING" as const, streak: 0 }]),
    create: vi.fn().mockResolvedValue(habit),
    get: vi.fn().mockResolvedValue(habit),
    update: vi.fn().mockResolvedValue(habit),
    delete: vi.fn().mockResolvedValue(undefined),
    setCompletion: vi.fn().mockResolvedValue(undefined),
    setRelapse: vi.fn().mockResolvedValue(undefined),
  };
  const habitsService: HabitsServiceContract = methods;
  return { app: createApp(authService, habitsService), methods };
}

const cookie = {
  Cookie: "habit_shaper_session=token",
  "Content-Type": "application/json",
};

describe("habit routes", () => {
  it("requires authentication", async () => {
    const { app } = setup(false);
    const response = await app.request("/habits", { headers: cookie });
    expect(response.status).toBe(401);
  });

  it("scopes list and get operations to the authenticated user", async () => {
    const { app, methods } = setup();
    expect((await app.request("/habits", { headers: cookie })).status).toBe(
      200
    );
    expect(
      (await app.request(`/habits/${habit.id}`, { headers: cookie })).status
    ).toBe(200);
    expect(methods.list).toHaveBeenCalledWith(user.id);
    expect(methods.get).toHaveBeenCalledWith(user.id, habit.id);
  });

  it("returns Today-ready habits in one request", async () => {
    const { app, methods } = setup();
    const response = await app.request("/habits/today", { headers: cookie });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      expect.objectContaining({ id: habit.id, state: "PENDING", streak: 0 }),
    ]);
    expect(methods.listToday).toHaveBeenCalledOnce();
    expect(methods.listToday).toHaveBeenCalledWith(user.id);
  });

  it("maps completion and relapse resources to idempotent service mutations", async () => {
    const { app, methods } = setup();
    const date = "2026-09-02";
    for (const [resource, method] of [
      ["completions", "PUT"],
      ["completions", "DELETE"],
      ["relapses", "PUT"],
      ["relapses", "DELETE"],
    ] as const) {
      const response = await app.request(
        `/habits/${habit.id}/${resource}/${date}`,
        { method, headers: cookie }
      );
      expect(response.status).toBe(204);
    }
    expect(methods.setCompletion).toHaveBeenNthCalledWith(
      1,
      user.id,
      habit.id,
      date,
      true
    );
    expect(methods.setCompletion).toHaveBeenNthCalledWith(
      2,
      user.id,
      habit.id,
      date,
      false
    );
    expect(methods.setRelapse).toHaveBeenNthCalledWith(
      1,
      user.id,
      habit.id,
      date,
      true
    );
    expect(methods.setRelapse).toHaveBeenNthCalledWith(
      2,
      user.id,
      habit.id,
      date,
      false
    );
  });

  it("rejects malformed tracking dates before calling the service", async () => {
    const { app, methods } = setup();
    const response = await app.request(
      `/habits/${habit.id}/completions/not-a-date`,
      { method: "PUT", headers: cookie }
    );
    expect(response.status).toBe(400);
    expect(methods.setCompletion).not.toHaveBeenCalled();
  });

  it("accepts BUILD schedules and rejects BREAK schedules", async () => {
    const { app, methods } = setup();
    const build = await app.request("/habits", {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        name: "Read",
        type: "BUILD",
        startDate: "2026-09-02",
        scheduleDays: [1, 3, 5],
      }),
    });
    const invalidBreak = await app.request("/habits", {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        name: "No sugar",
        type: "BREAK",
        startDate: "2026-09-02",
        scheduleDays: [1],
      }),
    });
    expect(build.status).toBe(201);
    expect(methods.create).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({ scheduleDays: [1, 3, 5] })
    );
    expect(invalidBreak.status).toBe(400);
  });

  it("rejects invalid dates, empty schedules, and habit type changes", async () => {
    const { app } = setup();
    for (const body of [
      {
        name: "Read",
        type: "BUILD",
        startDate: "not-a-date",
        scheduleDays: [1],
      },
      {
        name: "Read",
        type: "BUILD",
        startDate: "2026-09-02",
        scheduleDays: [],
      },
    ]) {
      expect(
        (
          await app.request("/habits", {
            method: "POST",
            headers: cookie,
            body: JSON.stringify(body),
          })
        ).status
      ).toBe(400);
    }
    expect(
      (
        await app.request(`/habits/${habit.id}`, {
          method: "PATCH",
          headers: cookie,
          body: JSON.stringify({ type: "BREAK" }),
        })
      ).status
    ).toBe(400);
  });

  it("scopes updates and deletions to the authenticated user", async () => {
    const { app, methods } = setup();
    expect(
      (
        await app.request(`/habits/${habit.id}`, {
          method: "PATCH",
          headers: cookie,
          body: JSON.stringify({ name: "Read daily" }),
        })
      ).status
    ).toBe(200);
    expect(
      (
        await app.request(`/habits/${habit.id}`, {
          method: "DELETE",
          headers: cookie,
        })
      ).status
    ).toBe(204);
    expect(methods.update).toHaveBeenCalledWith(user.id, habit.id, {
      name: "Read daily",
    });
    expect(methods.delete).toHaveBeenCalledWith(user.id, habit.id);
  });
});
