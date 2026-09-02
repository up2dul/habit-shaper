import { Hono } from "hono";
import { cors } from "hono/cors";

import { env } from "./config/env.js";
import { canQueryDatabase } from "./db/health.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: env.webOrigin,
    credentials: true,
  })
);

const routes = app
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
  });

export type AppType = typeof routes;
export { app };
