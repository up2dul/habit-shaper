import { hash, verify } from "argon2";
import { describe, expect, it } from "vitest";

import { digestSessionToken } from "./auth.service.js";

describe("authentication credentials", () => {
  it("hashes passwords with Argon2id", async () => {
    const passwordHash = await hash("correct horse battery staple", {
      type: 2,
    });
    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toContain("correct horse battery staple");
    await expect(
      verify(passwordHash, "correct horse battery staple")
    ).resolves.toBe(true);
  });

  it("stores a one-way digest rather than the raw session token", () => {
    const token = "a-sensitive-opaque-session-token";
    const digest = digestSessionToken(token);
    expect(digest).toHaveLength(64);
    expect(digest).not.toContain(token);
    expect(digestSessionToken(token)).toBe(digest);
  });
});
