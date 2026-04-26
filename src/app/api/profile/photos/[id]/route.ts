import { NextResponse } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { removePhoto } from "@/lib/photos";

export const dynamic = "force-dynamic";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const { id } = await params;
  const ok = await removePhoto(session.externalId, id);
  if (!ok) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
