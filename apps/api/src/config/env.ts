import { parseApiEnv } from "./env.schema.js";

export const env = parseApiEnv(process.env);
