import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/mysql2/migrator";

import { databaseEnv } from "../config/database-env.js";
import { createDatabaseClient } from "./client.js";

const { db, pool } = createDatabaseClient(databaseEnv);

try {
  const migrationsFolder = fileURLToPath(
    new URL("../../drizzle", import.meta.url)
  );

  await migrate(db, { migrationsFolder });
  console.log("Database migrations applied");
} finally {
  await pool.end();
}
