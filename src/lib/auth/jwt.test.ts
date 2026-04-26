import { describe, expect, it } from "vitest";
import { decodeJwtClaims, isExpired } from "./jwt";

function token(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("decodeJwtClaims", () => {
  it("decodes a well-formed JWT", () => {
    const claims = decodeJwtClaims(token({ sub: "user-1", exp: 9999999999 }));
    expect(claims).toEqual({ sub: "user-1", exp: 9999999999 });
  });

  it("returns null when there are not three segments", () => {
    expect(decodeJwtClaims("not-a-jwt")).toBeNull();
    expect(decodeJwtClaims("a.b")).toBeNull();
    expect(decodeJwtClaims("a.b.c.d")).toBeNull();
  });

  it("returns null when the body is not valid base64url JSON", () => {
    expect(decodeJwtClaims("a.&&&.c")).toBeNull();
  });

  it("returns null when sub is missing or not a string", () => {
    expect(decodeJwtClaims(token({ exp: 1 }))).toBeNull();
    expect(decodeJwtClaims(token({ sub: 42 }))).toBeNull();
  });
});

describe("isExpired", () => {
  it("treats no exp as not expired", () => {
    expect(isExpired({ sub: "x" })).toBe(false);
  });

  it("respects the skew window", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isExpired({ sub: "x", exp: now + 60 })).toBe(false);
    expect(isExpired({ sub: "x", exp: now + 10 }, 30)).toBe(true);
    expect(isExpired({ sub: "x", exp: now - 1 })).toBe(true);
  });
});
