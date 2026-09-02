import { describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";
import type {
  AuthResult,
  AuthServiceContract,
  AuthUser,
} from "./auth.service.js";

const user: AuthUser = {
  id: "019c0000-0000-7000-8000-000000000001",
  name: "Ada",
  email: "ada@example.com",
};

class FakeAuthService implements AuthServiceContract {
  activeToken: string | undefined;

  async register(input: RegisterInput): Promise<AuthResult> {
    this.activeToken = "register-token";
    return {
      user: { ...user, name: input.name, email: input.email },
      sessionToken: this.activeToken,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    if (input.password !== "correct-password") {
      const { AppError } = await import("../../lib/errors.js");
      throw new AppError("INVALID_CREDENTIALS");
    }
    this.activeToken = "login-token";
    return {
      user: { ...user, email: input.email },
      sessionToken: this.activeToken,
    };
  }

  async logout(sessionToken: string): Promise<void> {
    if (sessionToken === this.activeToken) this.activeToken = undefined;
  }

  async authenticate(sessionToken: string): Promise<AuthUser | null> {
    return sessionToken === this.activeToken ? user : null;
  }
}

describe("authentication routes", () => {
  it("registers a user and creates an HTTP-only session", async () => {
    const app = createApp(new FakeAuthService());
    const response = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: " Ada ",
        email: "ADA@EXAMPLE.COM",
        password: "correct-password",
      }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(user);
    expect(response.headers.get("set-cookie")).toContain(
      "habit_shaper_session=register-token"
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("rejects invalid login without exposing credential details", async () => {
    const app = createApp(new FakeAuthService());
    const response = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "ada@example.com",
        password: "wrong-password",
      }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect",
      },
    });
  });

  it("returns 401 for the current-user route without a session", async () => {
    const response = await createApp(new FakeAuthService()).request("/auth/me");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    });
  });

  it("invalidates a session on logout", async () => {
    const service = new FakeAuthService();
    service.activeToken = "login-token";
    const app = createApp(service);
    const cookie = "habit_shaper_session=login-token";

    expect(
      (await app.request("/auth/me", { headers: { cookie } })).status
    ).toBe(200);
    expect(
      (
        await app.request("/auth/logout", {
          method: "POST",
          headers: { cookie },
        })
      ).status
    ).toBe(204);
    expect(
      (await app.request("/auth/me", { headers: { cookie } })).status
    ).toBe(401);
  });

  it("returns the standard error shape for invalid payloads", async () => {
    const response = await createApp(new FakeAuthService()).request(
      "/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "",
          email: "not-an-email",
          password: "short",
        }),
      }
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
  });
});
