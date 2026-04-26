import { NextResponse } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { loadCandidates } from "@/lib/match";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const candidates = await loadCandidates(session.externalId);
  return NextResponse.json({ candidates });
}
