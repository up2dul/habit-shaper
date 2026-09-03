import { hash } from "argon2";
import { eq } from "drizzle-orm";

import { databaseEnv } from "../config/database-env.js";
import { createDatabaseClient } from "./client.js";
import {
  goals,
  habitLogs,
  habitScheduleDays,
  habitSchedules,
  habits,
  users,
} from "./schema/index.js";
import {
  assertSeedAllowed,
  buildSeedFixture,
  DEMO_USER,
} from "./seed-fixture.js";

assertSeedAllowed(process.env.NODE_ENV);

const fixture = buildSeedFixture();
const { db, pool } = createDatabaseClient(databaseEnv);

try {
  await db.transaction(async (transaction) => {
    const [emailOwner] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, DEMO_USER.email))
      .limit(1);

    if (emailOwner && emailOwner.id !== DEMO_USER.id) {
      throw new Error(
        `${DEMO_USER.email} already belongs to a different user; refusing to overwrite it`
      );
    }

    await transaction.delete(users).where(eq(users.id, DEMO_USER.id));

    const passwordHash = await hash(DEMO_USER.password, { type: 2 });
    await transaction.insert(users).values({
      id: fixture.user.id,
      name: fixture.user.name,
      email: fixture.user.email,
      passwordHash,
    });
    await transaction.insert(habits).values(fixture.habits);
    await transaction.insert(habitSchedules).values({
      id: fixture.schedule.id,
      habitId: fixture.schedule.habitId,
      effectiveFrom: fixture.schedule.effectiveFrom,
    });
    await transaction.insert(habitScheduleDays).values(
      fixture.schedule.days.map((dayOfWeek) => ({
        scheduleId: fixture.schedule.id,
        dayOfWeek,
      }))
    );
    await transaction.insert(goals).values(fixture.goals);
    await transaction.insert(habitLogs).values(fixture.logs);
  });

  console.log("Demo data seeded");
  console.log(`Email: ${DEMO_USER.email}`);
  console.log(`Password: ${DEMO_USER.password}`);
} finally {
  await pool.end();
}
