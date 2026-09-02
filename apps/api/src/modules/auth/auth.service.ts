import { createHash, randomBytes } from "node:crypto";

import { hash, verify } from "argon2";
import { and, eq, gt } from "drizzle-orm";

import { db as applicationDb } from "../../db/database.js";
import { sessions, users } from "../../db/schema/index.js";
import { AppError, ERROR_CODES } from "../../lib/errors.js";
import { createId } from "../../lib/id.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1_000;

export type AuthUser = { id: string; name: string; email: string };
export type AuthResult = { user: AuthUser; sessionToken: string };

export interface AuthServiceContract {
  register(input: RegisterInput): Promise<AuthResult>;
  login(input: LoginInput): Promise<AuthResult>;
  logout(sessionToken: string): Promise<void>;
  authenticate(sessionToken: string): Promise<AuthUser | null>;
}

type Database = typeof applicationDb;

export class AuthService implements AuthServiceContract {
  constructor(private readonly database: Database = applicationDb) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const user: AuthUser = {
      id: createId(),
      name: input.name,
      email: input.email,
    };
    const passwordHash = await hash(input.password, { type: 2 });
    const sessionToken = createSessionToken();
    const expiresAt = sessionExpiry();

    try {
      await this.database.transaction(async (transaction) => {
        await transaction.insert(users).values({ ...user, passwordHash });
        await transaction.insert(sessions).values({
          id: digestSessionToken(sessionToken),
          userId: user.id,
          expiresAt,
        });
      });
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new AppError(ERROR_CODES.EMAIL_ALREADY_REGISTERED);
      }
      throw error;
    }

    return { user, sessionToken };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const [record] = await this.database
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (!record || !(await verify(record.passwordHash, input.password))) {
      throw new AppError(ERROR_CODES.INVALID_CREDENTIALS);
    }

    const sessionToken = createSessionToken();
    await this.database.insert(sessions).values({
      id: digestSessionToken(sessionToken),
      userId: record.id,
      expiresAt: sessionExpiry(),
    });

    return {
      user: { id: record.id, name: record.name, email: record.email },
      sessionToken,
    };
  }

  async logout(sessionToken: string): Promise<void> {
    await this.database
      .delete(sessions)
      .where(eq(sessions.id, digestSessionToken(sessionToken)));
  }

  async authenticate(sessionToken: string): Promise<AuthUser | null> {
    const [user] = await this.database
      .select({ id: users.id, name: users.name, email: users.email })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.id, digestSessionToken(sessionToken)),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    return user ?? null;
  }
}

export function digestSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_LIFETIME_MS);
}

function isDuplicateEntry(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
}
