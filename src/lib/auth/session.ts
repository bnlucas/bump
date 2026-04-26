import "server-only";
import { readAccessToken } from "./cookies";
import { decodeJwtClaims, isExpired, type SigilClaims } from "./jwt";

export interface Session {
  externalId: string;
  claims: SigilClaims;
}

export async function currentSession(): Promise<Session | null> {
  const token = await readAccessToken();
  if (!token) return null;
  const claims = decodeJwtClaims(token);
  if (!claims || isExpired(claims)) return null;
  return { externalId: claims.sub, claims };
}
