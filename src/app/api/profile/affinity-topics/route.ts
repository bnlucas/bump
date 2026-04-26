import { NextResponse, type NextRequest } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { addAffinityTopic, type CreateAffinityTopic } from "@/lib/affinity-topics";

export const dynamic = "force-dynamic";

function parseBody(value: unknown): CreateAffinityTopic | { error: string } {
  if (!value || typeof value !== "object") return { error: "Body must be a JSON object." };
  const v = value as Record<string, unknown>;
  if (typeof v.topic_id !== "string" || !v.topic_id) return { error: "topic_id required." };
  if (typeof v.topic_type !== "string" || !v.topic_type) return { error: "topic_type required." };
  if (typeof v.preference_id !== "string" || !v.preference_id) {
    return { error: "preference_id required." };
  }
  const body: CreateAffinityTopic = {
    topic_id: v.topic_id,
    topic_type: v.topic_type,
    preference_id: v.preference_id,
  };
  if (typeof v.role_id === "string" && v.role_id) body.role_id = v.role_id;
  if (typeof v.reference_id === "string" && v.reference_id) body.reference_id = v.reference_id;
  if (typeof v.important === "boolean") body.important = v.important;
  if (typeof v.must_have === "boolean") body.must_have = v.must_have;
  return body;
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const json = await request.json().catch(() => null);
  const parsed = parseBody(json);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const topic = await addAffinityTopic(session.externalId, parsed);
  if (!topic) {
    return NextResponse.json({ error: "Failed to add topic." }, { status: 502 });
  }
  return NextResponse.json({ topic }, { status: 201 });
}
