import { NextResponse } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { addLike } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const { id } = await params;
  const result = await addLike(id, session.externalId);
  if (!result) {
    return NextResponse.json({ error: "Couldn't like." }, { status: 502 });
  }
  return NextResponse.json(result, { status: 201 });
}
