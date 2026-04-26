import { NextResponse, type NextRequest } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { heraldAdmin } from "@/lib/herald-admin";
import { messagingAllowed, userBasic } from "@/lib/match";
import { notifyUser } from "@/lib/notifications";

export const dynamic = "force-dynamic";

interface NotifyBody {
  stream_id: string;
  recipient_external_id: string;
  preview?: string;
}

function parseBody(value: unknown): NotifyBody | { error: string } {
  if (!value || typeof value !== "object") return { error: "Body must be a JSON object." };
  const v = value as Record<string, unknown>;
  if (typeof v.stream_id !== "string" || !v.stream_id) {
    return { error: "stream_id required." };
  }
  if (typeof v.recipient_external_id !== "string" || !v.recipient_external_id) {
    return { error: "recipient_external_id required." };
  }
  return {
    stream_id: v.stream_id,
    recipient_external_id: v.recipient_external_id,
    preview: typeof v.preview === "string" ? v.preview : undefined,
  };
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const json = await request.json().catch(() => null);
  const parsed = parseBody(json);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Sender must actually be a member of the stream they're claiming to push from.
  const members = await heraldAdmin()
    .members.list(parsed.stream_id)
    .catch(() => []);
  const senderMember = members.some((m) => m.user_id === session.externalId);
  const recipientMember = members.some(
    (m) => m.user_id === parsed.recipient_external_id,
  );
  if (!senderMember || !recipientMember) {
    return NextResponse.json({ delivered: false, reason: "not_a_member" });
  }

  // Don't push someone who's already actively connected to Herald.
  const presence = await heraldAdmin()
    .presence.getUser(parsed.recipient_external_id)
    .catch(() => null);
  const online =
    presence !== null &&
    typeof presence.connections === "number" &&
    presence.connections > 0;
  if (online) {
    return NextResponse.json({ delivered: false, reason: "online" });
  }

  // Re-check messaging permission server-side — sender could've been blocked
  // since the stream was created.
  const permission = await messagingAllowed(
    session.externalId,
    parsed.recipient_external_id,
  );
  if (!permission.allowed) {
    return NextResponse.json({ delivered: false, reason: "not_allowed" });
  }

  const senderName = (await userBasic(session.externalId))?.display_name ?? "Someone";
  const preview = parsed.preview?.slice(0, 120) ?? "sent you a message";
  void notifyUser({
    recipient: parsed.recipient_external_id,
    subject: `Message from ${senderName}`,
    body: preview,
  });

  return NextResponse.json({ delivered: true });
}
