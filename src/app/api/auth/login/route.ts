import { NextResponse, type NextRequest } from "next/server";
import { sigil, SIGIL_USER_SCHEMA } from "@/lib/sigil";
import { setSessionCookies } from "@/lib/auth/cookies";
import { decodeJwtClaims } from "@/lib/auth/jwt";

export const dynamic = "force-dynamic";

interface LoginBody {
  email: string;
  password: string;
}

function parseBody(value: unknown): LoginBody | { error: string } {
  if (!value || typeof value !== "object") return { error: "Body must be a JSON object." };
  const v = value as Record<string, unknown>;
  if (typeof v.email !== "string") return { error: "Invalid email." };
  if (typeof v.password !== "string") return { error: "Invalid password." };
  return { email: v.email, password: v.password };
}

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = parseBody(json);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const tokens = await sigil()
    .sessionLogin(SIGIL_USER_SCHEMA, "email", parsed.email, parsed.password)
    .catch(() => null);

  if (!tokens) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

  await setSessionCookies(tokens);

  const claims = decodeJwtClaims(tokens.access_token);
  return NextResponse.json({
    external_id: claims?.sub ?? null,
    expires_in: tokens.expires_in,
  });
}
