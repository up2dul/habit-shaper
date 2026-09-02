import { Hono } from "hono";
import { cors } from "hono/cors";

import { env } from "./config/env.js";
import { canQueryDatabase } from "./db/health.js";
import { AppError } from "./lib/app-error.js";
import { createAuthRoutes } from "./modules/auth/auth.routes.js";
import {
  AuthService,
  type AuthServiceContract,
} from "./modules/auth/auth.service.js";
import { createHabitsRoutes } from "./modules/habits/habits.routes.js";
import {
  HabitsService,
  type HabitsServiceContract,
} from "./modules/habits/habits.service.js";

export function createApp(
  authService: AuthServiceContract = new AuthService(),
  habitsService: HabitsServiceContract = new HabitsService()
) {
  const app = new Hono();

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
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      500
    );
  });

  return app
    .get("/", (c) => c.json({ name: "Habit Shaper API" }))
    .get("/health", async (c) => {
      if (!(await canQueryDatabase())) {
        return c.json(
          {
            error: {
              code: "DATABASE_UNAVAILABLE",
              message: "Database is unavailable",
            },
          },
          503
        );
      }

      return c.json({ status: "ok" });
    })
    .route("/auth", createAuthRoutes(authService))
    .route("/habits", createHabitsRoutes(authService, habitsService));
}

export const app = createApp();
export type AppType = typeof app;
