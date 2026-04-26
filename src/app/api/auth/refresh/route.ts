import { NextResponse } from "next/server";
import { sigil, SIGIL_USER_SCHEMA } from "@/lib/sigil";
import {
  clearSessionCookies,
  readRefreshToken,
  setSessionCookies,
} from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

export async function POST() {
  const refresh = await readRefreshToken();
  if (!refresh) return NextResponse.json({ error: "No session." }, { status: 401 });

  const tokens = await sigil()
    .sessionRefresh(SIGIL_USER_SCHEMA, refresh)
    .catch(() => null);

  if (!tokens) {
    await clearSessionCookies();
    return NextResponse.json({ error: "Refresh failed." }, { status: 401 });
  }

  await setSessionCookies(tokens);
  return NextResponse.json({ expires_in: tokens.expires_in });
}
