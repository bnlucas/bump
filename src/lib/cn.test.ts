import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy values with spaces", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("returns an empty string when given nothing truthy", () => {
    expect(cn(false, null, undefined)).toBe("");
  });

  it("preserves duplicate classes (caller's responsibility)", () => {
    expect(cn("a", "a")).toBe("a a");
  });
});
