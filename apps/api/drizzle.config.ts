import { defineConfig } from "drizzle-kit";

import { parseDatabaseEnv } from "./src/config/env.schema.ts";

const database = parseDatabaseEnv(process.env);

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: database.name,
  },
});
