import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import type { z } from "zod";

import { AppError } from "../../lib/app-error.js";
import { SESSION_COOKIE } from "../auth/auth.routes.js";
import type { AuthServiceContract, AuthUser } from "../auth/auth.service.js";
import {
  createHabitSchema,
  habitIdSchema,
  habitLogParamsSchema,
  updateHabitSchema,
} from "./habits.schema.js";
import type { HabitsServiceContract } from "./habits.service.js";

type HabitsEnv = { Variables: { user: AuthUser } };

export function createHabitsRoutes(
  authService: AuthServiceContract,
  habitsService: HabitsServiceContract
) {
  const routes = new Hono<HabitsEnv>();
  routes.use("*", async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    const user = token ? await authService.authenticate(token) : null;
    if (!user)
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    c.set("user", user);
    await next();
  });

  return routes
    .get("/today", async (c) =>
      c.json(await habitsService.listToday(c.var.user.id), 200)
    )
    .get("/", async (c) => c.json(await habitsService.list(c.var.user.id), 200))
    .post("/", validate("json", createHabitSchema), async (c) =>
      c.json(
        await habitsService.create(c.var.user.id, c.req.valid("json")),
        201
      )
    )
    .put(
      "/:habitId/completions/:date",
      validate("param", habitLogParamsSchema),
      async (c) => {
        const { habitId, date } = c.req.valid("param");
        await habitsService.setCompletion(c.var.user.id, habitId, date, true);
        return c.body(null, 204);
      }
    )
    .delete(
      "/:habitId/completions/:date",
      validate("param", habitLogParamsSchema),
      async (c) => {
        const { habitId, date } = c.req.valid("param");
        await habitsService.setCompletion(c.var.user.id, habitId, date, false);
        return c.body(null, 204);
      }
    )
    .put(
      "/:habitId/relapses/:date",
      validate("param", habitLogParamsSchema),
      async (c) => {
        const { habitId, date } = c.req.valid("param");
        await habitsService.setRelapse(c.var.user.id, habitId, date, true);
        return c.body(null, 204);
      }
    )
    .delete(
      "/:habitId/relapses/:date",
      validate("param", habitLogParamsSchema),
      async (c) => {
        const { habitId, date } = c.req.valid("param");
        await habitsService.setRelapse(c.var.user.id, habitId, date, false);
        return c.body(null, 204);
      }
    )
    .get("/:habitId", validate("param", habitIdSchema), async (c) =>
      c.json(
        await habitsService.get(c.var.user.id, c.req.valid("param").habitId),
        200
      )
    )
    .patch(
      "/:habitId",
      validate("param", habitIdSchema),
      validate("json", updateHabitSchema),
      async (c) =>
        c.json(
          await habitsService.update(
            c.var.user.id,
            c.req.valid("param").habitId,
            c.req.valid("json")
          ),
          200
        )
    )
    .delete("/:habitId", validate("param", habitIdSchema), async (c) => {
      await habitsService.delete(c.var.user.id, c.req.valid("param").habitId);
      return c.body(null, 204);
    });
}

function validate<TTarget extends "json" | "param", TSchema extends z.ZodType>(
  target: TTarget,
  schema: TSchema
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.issues[0]?.message ?? "Invalid request",
          },
        },
        400
      );
    }
  });
}
