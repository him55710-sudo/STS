import { describe, expect, it } from "vitest";
import { safeInternalPath } from "../../lib/navigation";

describe("safeInternalPath", () => {
  it("returns an internal destination when the requested path is safe", () => {
    const result = safeInternalPath("/feed?tab=following");

    expect(result).toBe("/feed?tab=following");
  });

  it("falls back to the platform home for unsafe destinations", () => {
    const result = safeInternalPath("https://example.com");

    expect(result).toBe("/feed");
  });

  it("falls back when a protocol-relative destination is supplied", () => {
    const result = safeInternalPath("//example.com");

    expect(result).toBe("/feed");
  });
});
