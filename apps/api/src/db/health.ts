import { sql } from "drizzle-orm";

import { db } from "./client.js";

export async function canQueryDatabase(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}
