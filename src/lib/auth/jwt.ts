import "server-only";

export interface SigilClaims {
  sub: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export function decodeJwtClaims(token: string): SigilClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const claims = JSON.parse(json);
    if (!claims || typeof claims !== "object" || typeof claims.sub !== "string") return null;
    return claims as SigilClaims;
  } catch {
    return null;
  }
}

export function isExpired(claims: SigilClaims, skewSeconds = 30): boolean {
  if (typeof claims.exp !== "number") return false;
  return Date.now() / 1000 >= claims.exp - skewSeconds;
}
