import { NextResponse, type NextRequest } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { writeActiveContext } from "@/lib/context";
import { listConsents } from "@/lib/consents";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const json = (await request.json().catch(() => null)) as
    | { context?: string | null }
    | null;
  const layerKey = json?.context ?? null;

  if (layerKey) {
    const granted = await listConsents(session.externalId);
    if (!granted.some((c) => c.consent_type === layerKey)) {
      return NextResponse.json(
        { error: "Cannot switch to a context you have not granted." },
        { status: 403 },
      );
    }
  }

  await writeActiveContext(layerKey);
  return NextResponse.json({ context: layerKey });
}
