import { describe, expect, it } from "vitest";

import { parseApiEnv, parseDatabaseEnv } from "./env.schema.js";

describe("API environment", () => {
  it("provides local defaults", () => {
    expect(parseApiEnv({})).toEqual({
      nodeEnv: "development",
      port: 3_000,
      webOrigin: "http://localhost:5173",
      database: {
        host: "localhost",
        port: 3_306,
        user: "habit_shaper",
        password: "habit_shaper",
        name: "habit_shaper",
      },
    });
  });

  it("coerces valid port strings", () => {
    const value = parseApiEnv({ PORT: "4000", DATABASE_PORT: "3307" });

    expect(value.port).toBe(4_000);
    expect(value.database.port).toBe(3_307);
  });

  it("reports all invalid values without exposing secrets", () => {
    const secret = "do-not-print-this";

    expect(() =>
      parseApiEnv({
        PORT: "70000",
        DATABASE_PORT: "invalid",
        DATABASE_PASSWORD: secret,
        WEB_ORIGIN: "ftp://example.com",
      })
    ).toThrow(
      expect.objectContaining({
        message: expect.stringMatching(
          /PORT[\s\S]*DATABASE_PORT[\s\S]*WEB_ORIGIN/
        ),
      })
    );

    try {
      parseApiEnv({ PORT: "invalid", DATABASE_PASSWORD: secret });
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
    }
  });

  it("requires explicit production configuration", () => {
    expect(() => parseApiEnv({ NODE_ENV: "production" })).toThrowError(
      /DATABASE_HOST[\s\S]*DATABASE_PORT[\s\S]*DATABASE_USER[\s\S]*DATABASE_PASSWORD[\s\S]*DATABASE_NAME[\s\S]*PORT[\s\S]*WEB_ORIGIN/
    );
  });

  it("accepts complete production configuration", () => {
    expect(
      parseApiEnv({
        NODE_ENV: "production",
        PORT: "3000",
        DATABASE_HOST: "mysql",
        DATABASE_PORT: "3306",
        DATABASE_USER: "app",
        DATABASE_PASSWORD: "secret",
        DATABASE_NAME: "habit_shaper",
        WEB_ORIGIN: "https://habit.example.com",
      }).nodeEnv
    ).toBe("production");
  });

  it("applies the same production rules to Drizzle", () => {
    expect(() => parseDatabaseEnv({ NODE_ENV: "production" })).toThrowError(
      /DATABASE_PASSWORD/
    );
  });
});
