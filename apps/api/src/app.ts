import { connect } from "node:net";

import { Hono } from "hono";
import { cors } from "hono/cors";

const databaseHost = process.env.DATABASE_HOST ?? "localhost";
const databasePort = Number(process.env.DATABASE_PORT ?? "3306");
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

function canReachDatabase(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: databaseHost, port: databasePort });

    socket.setTimeout(2_000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

const app = new Hono();

app.use(
  "*",
  cors({
    origin: webOrigin,
    credentials: true,
  })
);

const routes = app
  .get("/", (c) => c.json({ name: "Habit Shaper API" }))
  .get("/health", async (c) => {
    if (!(await canReachDatabase())) {
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
