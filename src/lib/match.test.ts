import { describe, expect, it } from "vitest";
import { streamIdForPair } from "./match";

describe("streamIdForPair", () => {
  it("is symmetric — order of args doesn't matter", () => {
    expect(streamIdForPair("a", "b")).toBe(streamIdForPair("b", "a"));
  });

  it("uses the lexicographic min then max", () => {
    expect(streamIdForPair("zeta", "alpha")).toBe("match-alpha-zeta");
  });

  it("handles uuid-shaped ids", () => {
    const a = "11111111-1111-1111-1111-111111111111";
    const b = "22222222-2222-2222-2222-222222222222";
    expect(streamIdForPair(a, b)).toBe(`match-${a}-${b}`);
    expect(streamIdForPair(b, a)).toBe(`match-${a}-${b}`);
  });
});
