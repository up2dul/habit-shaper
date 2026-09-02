import { defineConfig } from "drizzle-kit";

const host = process.env.DATABASE_HOST ?? "localhost";
const port = process.env.DATABASE_PORT ?? "3306";
const user = process.env.DATABASE_USER ?? "habit_shaper";
const password = process.env.DATABASE_PASSWORD ?? "habit_shaper";
const database = process.env.DATABASE_NAME ?? "habit_shaper";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: `mysql://${user}:${password}@${host}:${port}/${database}`,
  },
});
