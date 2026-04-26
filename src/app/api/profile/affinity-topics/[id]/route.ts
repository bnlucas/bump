import { NextResponse } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { removeAffinityTopic } from "@/lib/affinity-topics";

export const dynamic = "force-dynamic";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const { id } = await params;
  const ok = await removeAffinityTopic(session.externalId, id);
  if (!ok) {
    return NextResponse.json({ error: "Failed to remove topic." }, { status: 502 });
  }
  return new NextResponse(null, { status: 204 });
}
