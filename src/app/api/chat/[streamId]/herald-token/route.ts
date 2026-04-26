import { NextResponse } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { heraldAdmin } from "@/lib/herald-admin";
import { mintHeraldToken } from "@/lib/herald-token";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const { streamId } = await params;

  const members = await heraldAdmin()
    .members.list(streamId)
    .catch(() => []);
  const isMember = members.some((m) => m.user_id === session.externalId);
  if (!isMember) {
    return NextResponse.json({ error: "Not a member of this stream." }, { status: 403 });
  }

  const creds = mintHeraldToken(session.externalId, [streamId]);
  return NextResponse.json(creds);
}
