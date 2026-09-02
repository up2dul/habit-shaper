import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { z } from "zod";

import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import type { AuthServiceContract, AuthUser } from "./auth.service.js";

export const SESSION_COOKIE = "habit_shaper_session";

type AuthEnv = { Variables: { user: AuthUser } };

export function createAuthRoutes(authService: AuthServiceContract) {
  const routes = new Hono<AuthEnv>()
    .post("/register", validateJson(registerSchema), async (c) => {
      const result = await authService.register(c.req.valid("json"));
      writeSessionCookie(c, result.sessionToken);
      return c.json(result.user, 201);
    })
    .post("/login", validateJson(loginSchema), async (c) => {
      const result = await authService.login(c.req.valid("json"));
      writeSessionCookie(c, result.sessionToken);
      return c.json(result.user, 200);
    })
    .post("/logout", async (c) => {
      const token = getCookie(c, SESSION_COOKIE);
      if (token) await authService.logout(token);
      deleteCookie(c, SESSION_COOKIE, cookieOptions());
      return c.body(null, 204);
    })
    .get("/me", async (c) => {
      const token = getCookie(c, SESSION_COOKIE);
      const user = token ? await authService.authenticate(token) : null;
      if (!user)
        throw new AppError("UNAUTHORIZED", "Authentication required", 401);
      return c.json(user, 200);
    });

  return routes;
}

function validateJson<TSchema extends z.ZodType>(schema: TSchema) {
  return zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.issues[0]?.message ?? "Invalid request",
          },
        },
        400
      );
    }
  });
}

function writeSessionCookie(c: Parameters<typeof setCookie>[0], token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    ...cookieOptions(),
    maxAge: 30 * 24 * 60 * 60,
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "Lax" as const,
    secure: env.nodeEnv === "production",
  };
}
