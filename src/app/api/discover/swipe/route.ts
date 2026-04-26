import { NextResponse, type NextRequest } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { openMatchStream, recordSwipe, type SwipeDirection } from "@/lib/match";

export const dynamic = "force-dynamic";

interface SwipeBody {
  target_id: string;
  direction: SwipeDirection;
}

function parseBody(value: unknown): SwipeBody | { error: string } {
  if (!value || typeof value !== "object") return { error: "Body must be a JSON object." };
  const v = value as Record<string, unknown>;
  if (typeof v.target_id !== "string" || !v.target_id) return { error: "target_id required." };
  if (v.direction !== "right" && v.direction !== "left") {
    return { error: "direction must be 'right' or 'left'." };
  }
  return { target_id: v.target_id, direction: v.direction };
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const json = await request.json().catch(() => null);
  const parsed = parseBody(json);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  await recordSwipe(session.externalId, parsed.target_id, parsed.direction);

  if (parsed.direction === "right") {
    const stream_id = await openMatchStream(session.externalId, parsed.target_id);
    return NextResponse.json({ stream_id });
  }
  return NextResponse.json({ stream_id: null });
}
