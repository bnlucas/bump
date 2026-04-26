import { NextResponse } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { removeLike } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; engagementId: string }> },
) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const { id, engagementId } = await params;
  const ok = await removeLike(id, engagementId);
  if (!ok) {
    return NextResponse.json({ error: "Couldn't undo." }, { status: 502 });
  }
  return new NextResponse(null, { status: 204 });
}
