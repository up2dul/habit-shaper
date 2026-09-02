import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import type { z } from "zod";

import { AppError, ERROR_CODES } from "../../lib/errors.js";
import { HttpStatus } from "../../lib/http-status.js";
import { SESSION_COOKIE } from "../auth/auth.routes.js";
import type { AuthServiceContract, AuthUser } from "../auth/auth.service.js";
import {
  createGoalSchema,
  goalParamsSchema,
  habitGoalParamsSchema,
  updateGoalSchema,
} from "./goals.schema.js";
import type { GoalsServiceContract } from "./goals.service.js";

type GoalsEnv = { Variables: { user: AuthUser } };

export function createGoalsRoutes(
  authService: AuthServiceContract,
  goalsService: GoalsServiceContract
) {
  const routes = new Hono<GoalsEnv>();
  routes.use("*", async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    const user = token ? await authService.authenticate(token) : null;
    if (!user) throw new AppError(ERROR_CODES.UNAUTHORIZED);
    c.set("user", user);
    await next();
  });

  return routes
    .get(
      "/:habitId/goals",
      validate("param", habitGoalParamsSchema),
      async (c) =>
        c.json(
          await goalsService.list(c.var.user.id, c.req.valid("param").habitId),
          HttpStatus.OK
        )
    )
    .post(
      "/:habitId/goals",
      validate("param", habitGoalParamsSchema),
      validate("json", createGoalSchema),
      async (c) =>
        c.json(
          await goalsService.create(
            c.var.user.id,
            c.req.valid("param").habitId,
            c.req.valid("json")
          ),
          HttpStatus.CREATED
        )
    )
    .patch(
      "/:habitId/goals/:goalId",
      validate("param", goalParamsSchema),
      validate("json", updateGoalSchema),
      async (c) => {
        const { habitId, goalId } = c.req.valid("param");
        return c.json(
          await goalsService.update(
            c.var.user.id,
            habitId,
            goalId,
            c.req.valid("json")
          ),
          HttpStatus.OK
        );
      }
    )
    .delete(
      "/:habitId/goals/:goalId",
      validate("param", goalParamsSchema),
      async (c) => {
        const { habitId, goalId } = c.req.valid("param");
        await goalsService.delete(c.var.user.id, habitId, goalId);
        return c.body(null, HttpStatus.NO_CONTENT);
      }
    );
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
