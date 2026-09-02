import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../app.js";
import type { AuthServiceContract } from "../auth/auth.service.js";
import type { HabitsServiceContract } from "../habits/habits.service.js";
import type { Goal } from "./goals.service.js";

const user = {
  id: "019caaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa",
  name: "A",
  email: "a@example.com",
};
const habitId = "019cbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb";
const goal: Goal = {
  id: "019ccccc-cccc-7ccc-8ccc-cccccccccccc",
  habitId,
  targetSuccessfulDays: 30,
  successfulDays: 7,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
};

function setup(authenticated = true) {
  const authService: AuthServiceContract = {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    authenticate: vi.fn().mockResolvedValue(authenticated ? user : null),
  };
  const habitsService = {
    list: vi.fn(),
    listToday: vi.fn(),
    history: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setCompletion: vi.fn(),
    setRelapse: vi.fn(),
  } satisfies HabitsServiceContract;
  const methods = {
    list: vi.fn().mockResolvedValue([goal]),
    create: vi.fn().mockResolvedValue(goal),
    update: vi.fn().mockResolvedValue(goal),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  return {
    app: createApp(authService, habitsService, methods),
    methods,
  };
}

const headers = {
  Cookie: "habit_shaper_session=token",
  "Content-Type": "application/json",
};

describe("goal routes", () => {
  it("requires authentication", async () => {
    const { app } = setup(false);
    expect(
      (await app.request(`/habits/${habitId}/goals`, { headers })).status
    ).toBe(401);
  });

  it("lists and creates goals in the habit context", async () => {
    const { app, methods } = setup();
    const list = await app.request(`/habits/${habitId}/goals`, { headers });
    const create = await app.request(`/habits/${habitId}/goals`, {
      method: "POST",
      headers,
      body: JSON.stringify({ targetSuccessfulDays: 30 }),
    });
    expect(list.status).toBe(200);
    expect(create.status).toBe(201);
    expect(methods.list).toHaveBeenCalledWith(user.id, habitId);
    expect(methods.create).toHaveBeenCalledWith(user.id, habitId, {
      targetSuccessfulDays: 30,
    });
  });

  it("updates and deletes only the nested goal", async () => {
    const { app, methods } = setup();
    const path = `/habits/${habitId}/goals/${goal.id}`;
    expect(
      (
        await app.request(path, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ targetSuccessfulDays: 60 }),
        })
      ).status
    ).toBe(200);
    expect(
      (await app.request(path, { method: "DELETE", headers })).status
    ).toBe(204);
    expect(methods.update).toHaveBeenCalledWith(user.id, habitId, goal.id, {
      targetSuccessfulDays: 60,
    });
    expect(methods.delete).toHaveBeenCalledWith(user.id, habitId, goal.id);
  });

  it("rejects non-positive and non-integer targets", async () => {
    const { app, methods } = setup();
    for (const targetSuccessfulDays of [0, -1, 1.5]) {
      const response = await app.request(`/habits/${habitId}/goals`, {
        method: "POST",
        headers,
        body: JSON.stringify({ targetSuccessfulDays }),
      });
      expect(response.status).toBe(400);
    }
    expect(methods.create).not.toHaveBeenCalled();
  });
});
