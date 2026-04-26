import "server-only";
import { cookies } from "next/headers";

export const CONTEXT_COOKIE = "bump.context";

export async function readActiveContext(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CONTEXT_COOKIE)?.value ?? null;
}

export async function writeActiveContext(layerKey: string | null) {
  const jar = await cookies();
  if (!layerKey) {
    jar.delete(CONTEXT_COOKIE);
    return;
  }
  jar.set(CONTEXT_COOKIE, layerKey, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
