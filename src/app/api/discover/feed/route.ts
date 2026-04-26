import { NextResponse } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { loadCandidates } from "@/lib/match";
import { readActiveContext } from "@/lib/context";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const context = await readActiveContext();
  const candidates = await loadCandidates(session.externalId, context);
  return NextResponse.json({ context, candidates });
}
