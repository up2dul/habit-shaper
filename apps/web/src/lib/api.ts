import type { AppType } from "@habit-shaper/api";
import { hc } from "hono/client";

import { webEnv } from "@/config/env";

export const api = hc<AppType>(webEnv.apiUrl, {
  init: { credentials: "include" },
});

export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as
    | T
    | { error: { code: string; message: string } };
  if (!response.ok && "error" in (body as object)) {
    const error = (body as { error: { code: string; message: string } }).error;
    throw new ApiError(error.code, error.message);
  }
  if (!response.ok)
    throw new ApiError("UNEXPECTED_ERROR", "Something went wrong");
  return body as T;
}
