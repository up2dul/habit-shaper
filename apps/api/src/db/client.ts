import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? "3306"),
  user: process.env.DATABASE_USER ?? "habit_shaper",
  password: process.env.DATABASE_PASSWORD ?? "habit_shaper",
  database: process.env.DATABASE_NAME ?? "habit_shaper",
  connectionLimit: 10,
});

const db = drizzle({ client: pool });

export { db, pool };
