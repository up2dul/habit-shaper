import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

export function createDatabaseClient(config: {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
}) {
  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.name,
    connectionLimit: 10,
  });

  return { db: drizzle({ client: pool }), pool };
}
