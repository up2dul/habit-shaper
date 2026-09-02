import { describe, expect, it, vi } from "vitest";

import { createApp } from "./app.js";
import type { AuthServiceContract } from "./modules/auth/auth.service.js";
import type { GoalsServiceContract } from "./modules/goals/goals.service.js";
import type { HabitsServiceContract } from "./modules/habits/habits.service.js";

const authService: AuthServiceContract = {
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  authenticate: vi.fn().mockResolvedValue({
    id: "user-1",
    name: "Ada",
    email: "ada@example.com",
  }),
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
const goalsService = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} satisfies GoalsServiceContract;

const app = createApp(authService, habitsService, goalsService);
const headers = {
  Origin: "http://localhost:5173",
  Cookie: "habit_shaper_session=token",
  "Content-Type": "application/json",
};

describe("unsafe request origin validation", () => {
  it.each([
    ["POST", "/auth/logout"],
    ["PATCH", "/habits/habit-1"],
    ["DELETE", "/habits/habit-1"],
  ] as const)("accepts the configured origin for %s", async (method, path) => {
    const response = await app.request(path, { method, headers });
    expect(response.status).not.toBe(403);
  });

  it.each([
    ["POST", "/auth/logout"],
    ["PATCH", "/habits/habit-1"],
    ["DELETE", "/habits/habit-1"],
  ] as const)("rejects a mismatched origin for %s", async (method, path) => {
    const response = await app.request(path, {
      method,
      headers: { ...headers, Origin: "https://attacker.example" },
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_ORIGIN",
        message: "Request origin is not allowed",
      },
    });
  });
});
