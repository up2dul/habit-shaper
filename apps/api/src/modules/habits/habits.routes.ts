import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import type { z } from "zod";

import { AppError, ERROR_CODES } from "../../lib/errors.js";
import { HttpStatus } from "../../lib/http-status.js";
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
    if (!user) throw new AppError(ERROR_CODES.UNAUTHORIZED);
    c.set("user", user);
    await next();
  });

  return routes
    .get("/today", async (c) =>
      c.json(await habitsService.listToday(c.var.user.id), HttpStatus.OK)
    )
    .get("/", async (c) =>
      c.json(await habitsService.list(c.var.user.id), HttpStatus.OK)
    )
    .post("/", validate("json", createHabitSchema), async (c) =>
      c.json(
        await habitsService.create(c.var.user.id, c.req.valid("json")),
        HttpStatus.CREATED
      )
    )
    .put(
      "/:habitId/completions/:date",
      validate("param", habitLogParamsSchema),
      async (c) => {
        const { habitId, date } = c.req.valid("param");
        await habitsService.setCompletion(c.var.user.id, habitId, date, true);
        return c.body(null, HttpStatus.NO_CONTENT);
      }
    )
    .delete(
      "/:habitId/completions/:date",
      validate("param", habitLogParamsSchema),
      async (c) => {
        const { habitId, date } = c.req.valid("param");
        await habitsService.setCompletion(c.var.user.id, habitId, date, false);
        return c.body(null, HttpStatus.NO_CONTENT);
      }
    )
    .put(
      "/:habitId/relapses/:date",
      validate("param", habitLogParamsSchema),
      async (c) => {
        const { habitId, date } = c.req.valid("param");
        await habitsService.setRelapse(c.var.user.id, habitId, date, true);
        return c.body(null, HttpStatus.NO_CONTENT);
      }
    )
    .delete(
      "/:habitId/relapses/:date",
      validate("param", habitLogParamsSchema),
      async (c) => {
        const { habitId, date } = c.req.valid("param");
        await habitsService.setRelapse(c.var.user.id, habitId, date, false);
        return c.body(null, HttpStatus.NO_CONTENT);
      }
    )
    .get("/:habitId", validate("param", habitIdSchema), async (c) =>
      c.json(
        await habitsService.get(c.var.user.id, c.req.valid("param").habitId),
        HttpStatus.OK
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
          HttpStatus.OK
        )
    )
    .delete("/:habitId", validate("param", habitIdSchema), async (c) => {
      await habitsService.delete(c.var.user.id, c.req.valid("param").habitId);
      return c.body(null, HttpStatus.NO_CONTENT);
    });
}

function validate<TTarget extends "json" | "param", TSchema extends z.ZodType>(
  target: TTarget,
  schema: TSchema
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        result.error.issues[0]?.message ?? undefined
      );
    }
  });
}
