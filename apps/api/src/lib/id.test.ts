import { validate, version } from "uuid";
import { describe, expect, it } from "vitest";

import { createId } from "./id.js";

describe("createId", () => {
  it("creates valid UUIDv7 identifiers", () => {
    const id = createId();

    expect(validate(id)).toBe(true);
    expect(version(id)).toBe(7);
    expect(id).toHaveLength(36);
  });

  it("creates time-ordered identifiers", () => {
    const ids = Array.from({ length: 10 }, createId);

    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids)).toHaveLength(ids.length);
  });
});
