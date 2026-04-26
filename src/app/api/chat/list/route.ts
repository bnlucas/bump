import { NextResponse } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { listConversations } from "@/lib/match";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const conversations = await listConversations(session.externalId);
  return NextResponse.json({ conversations });
}
