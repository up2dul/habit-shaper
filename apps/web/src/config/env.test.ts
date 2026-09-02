import { describe, expect, it } from "vitest";

import { parseWebEnv } from "./env";

describe("web environment", () => {
  it("provides the local API URL outside production", () => {
    expect(parseWebEnv({}, "development")).toEqual({
      apiUrl: "http://localhost:3000",
    });
  });

  it("requires an explicit production API URL", () => {
    expect(() => parseWebEnv({}, "production")).toThrow(
      /VITE_API_URL: is required in production/
    );
  });

  it("rejects non-HTTP URLs", () => {
    expect(() =>
      parseWebEnv({ VITE_API_URL: "ftp://example.com" }, "development")
    ).toThrow(/must be a root-relative path or use the http\/https protocol/);
  });

  it("accepts a same-origin API path in production", () => {
    expect(parseWebEnv({ VITE_API_URL: "/api" }, "production")).toEqual({
      apiUrl: "/api",
    });
  });

  it("accepts a valid production API URL", () => {
    expect(
      parseWebEnv(
        { VITE_API_URL: "https://api.habit.example.com" },
        "production"
      )
    ).toEqual({ apiUrl: "https://api.habit.example.com" });
  });
});
