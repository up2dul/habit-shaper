import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/mysql2/migrator";

import { db, pool } from "./client.js";

try {
  const migrationsFolder = fileURLToPath(
    new URL("../../drizzle", import.meta.url)
  );

  await migrate(db, { migrationsFolder });
  console.log("Database migrations applied");
} finally {
  await pool.end();
}
