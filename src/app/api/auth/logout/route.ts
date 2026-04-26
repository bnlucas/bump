import { NextResponse } from "next/server";
import { sigil, SIGIL_USER_SCHEMA } from "@/lib/sigil";
import { clearSessionCookies, readRefreshToken } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

export async function POST() {
  const refresh = await readRefreshToken();
  if (refresh) {
    await sigil().sessionRevoke(SIGIL_USER_SCHEMA, refresh).catch(() => {});
  }
  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
