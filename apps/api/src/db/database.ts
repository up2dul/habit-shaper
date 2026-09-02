import { env } from "../config/env.js";
import { createDatabaseClient } from "./client.js";

export const { db, pool } = createDatabaseClient(env.database);
