import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { z } from "zod";

import { env } from "../../config/env.js";
import { AppError, ERROR_CODES } from "../../lib/errors.js";
import { HttpStatus } from "../../lib/http-status.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import type { AuthServiceContract, AuthUser } from "./auth.service.js";

export const SESSION_COOKIE = "habit_shaper_session";

type AuthEnv = { Variables: { user: AuthUser } };

export function createAuthRoutes(authService: AuthServiceContract) {
  const routes = new Hono<AuthEnv>()
    .post("/register", validateJson(registerSchema), async (c) => {
      const result = await authService.register(c.req.valid("json"));
      writeSessionCookie(c, result.sessionToken);
      return c.json(result.user, HttpStatus.CREATED);
    })
    .post("/login", validateJson(loginSchema), async (c) => {
      const result = await authService.login(c.req.valid("json"));
      writeSessionCookie(c, result.sessionToken);
      return c.json(result.user, HttpStatus.OK);
    })
    .post("/logout", async (c) => {
      const token = getCookie(c, SESSION_COOKIE);
      if (token) await authService.logout(token);
      deleteCookie(c, SESSION_COOKIE, cookieOptions());
      return c.body(null, HttpStatus.NO_CONTENT);
    })
    .get("/me", async (c) => {
      const token = getCookie(c, SESSION_COOKIE);
      const user = token ? await authService.authenticate(token) : null;
      if (!user) throw new AppError(ERROR_CODES.UNAUTHORIZED);
      return c.json(user, HttpStatus.OK);
    });

  return routes;
}

function validateJson<TSchema extends z.ZodType>(schema: TSchema) {
  return zValidator("json", schema, (result) => {
    if (!result.success) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        result.error.issues[0]?.message ?? undefined
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
