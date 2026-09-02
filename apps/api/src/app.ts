import { Hono } from "hono";
import { cors } from "hono/cors";

import { env } from "./config/env.js";
import { canQueryDatabase } from "./db/health.js";
import { AppError, ERROR_CODES } from "./lib/errors.js";
import { HttpStatus } from "./lib/http-status.js";
import { createAuthRoutes } from "./modules/auth/auth.routes.js";
import {
  AuthService,
  type AuthServiceContract,
} from "./modules/auth/auth.service.js";
import { createGoalsRoutes } from "./modules/goals/goals.routes.js";
import {
  GoalsService,
  type GoalsServiceContract,
} from "./modules/goals/goals.service.js";
import { createHabitsRoutes } from "./modules/habits/habits.routes.js";
import {
  HabitsService,
  type HabitsServiceContract,
} from "./modules/habits/habits.service.js";

export function createApp(
  authService: AuthServiceContract = new AuthService(),
  habitsService: HabitsServiceContract = new HabitsService(),
  goalsService: GoalsServiceContract = new GoalsService()
) {
  const app = new Hono();

  app.use("*", async (c, next) => {
    if (["POST", "PATCH", "DELETE"].includes(c.req.method)) {
      const origin = c.req.header("Origin");
      if (origin !== undefined && origin !== env.webOrigin) {
        throw new AppError(ERROR_CODES.INVALID_ORIGIN);
      }
    }
    await next();
  });

  app.use(
    "*",
    cors({
      origin: env.webOrigin,
      credentials: true,
    })
  );

  app.onError((error, c) => {
    if (error instanceof AppError) {
      return c.json(
        { error: { code: error.code, message: error.message } },
        error.status
      );
    }
    console.error("Unhandled request error", error);
    return c.json(
      {
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: "Something went wrong",
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  });

  return app
    .get("/", (c) => c.json({ name: "Habit Shaper API" }))
    .get("/health", async (c) => {
      if (!(await canQueryDatabase())) {
        return c.json(
          {
            error: {
              code: ERROR_CODES.DATABASE_UNAVAILABLE,
              message: "Database is unavailable",
            },
          },
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      return c.json({ status: "ok" });
    })
    .route("/auth", createAuthRoutes(authService))
    .route("/habits", createHabitsRoutes(authService, habitsService))
    .route("/habits", createGoalsRoutes(authService, goalsService));
}

export const app = createApp();
export type AppType = typeof app;
