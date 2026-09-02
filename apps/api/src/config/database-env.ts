import { parseDatabaseEnv } from "./env.schema.js";

export const databaseEnv = parseDatabaseEnv(process.env);
