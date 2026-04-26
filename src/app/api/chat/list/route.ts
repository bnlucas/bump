import { NextResponse } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { userStreamIds } from "@/lib/match";
import { heraldAdmin } from "@/lib/herald-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const ids = await userStreamIds(session.externalId);
  const admin = heraldAdmin();

  const streams = await Promise.all(
    ids.map(async (id) => {
      const [info, members] = await Promise.all([
        admin.streams.get(id).catch(() => null),
        admin.members.list(id).catch(() => []),
      ]);
      const counterparts = members
        .map((m) => m.user_id)
        .filter((u) => u !== session.externalId);
      return {
        stream_id: id,
        name: info?.name ?? id,
        counterpart_id: counterparts[0] ?? null,
      };
    }),
  );

  return NextResponse.json({ streams });
}
