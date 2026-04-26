import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth/session";
import { sigil, SIGIL_USER_SCHEMA } from "@/lib/sigil";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  const envelope = await sigil()
    .userGet(SIGIL_USER_SCHEMA, session.externalId)
    .catch(() => null);

  return NextResponse.json({
    external_id: session.externalId,
    fields: envelope?.fields ?? null,
  });
}
