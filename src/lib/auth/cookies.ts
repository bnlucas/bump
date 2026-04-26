import "server-only";
import { cookies } from "next/headers";

export const ACCESS_COOKIE = "bump.access";
export const REFRESH_COOKIE = "bump.refresh";

interface SessionTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

const COMMON = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

export async function setSessionCookies(tokens: SessionTokens) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, tokens.access_token, {
    ...COMMON,
    maxAge: tokens.expires_in,
  });
  jar.set(REFRESH_COOKIE, tokens.refresh_token, {
    ...COMMON,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function readAccessToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ACCESS_COOKIE)?.value ?? null;
}

export async function readRefreshToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(REFRESH_COOKIE)?.value ?? null;
}
