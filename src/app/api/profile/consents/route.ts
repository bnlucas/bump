import { NextResponse, type NextRequest } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { grantConsent, listConsentLayers, listConsents } from "@/lib/consents";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const [granted, layers] = await Promise.all([
    listConsents(session.externalId),
    listConsentLayers(),
  ]);
  return NextResponse.json({ granted, layers });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const json = await request.json().catch(() => null);
  const consent_type =
    json && typeof (json as Record<string, unknown>).consent_type === "string"
      ? ((json as Record<string, unknown>).consent_type as string)
      : null;
  if (!consent_type) {
    return NextResponse.json({ error: "consent_type required." }, { status: 400 });
  }

  const consent = await grantConsent(session.externalId, consent_type);
  if (!consent) {
    return NextResponse.json({ error: "Failed to grant consent." }, { status: 502 });
  }
  return NextResponse.json({ consent }, { status: 201 });
}
