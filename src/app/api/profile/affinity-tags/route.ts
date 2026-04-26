import { NextResponse, type NextRequest } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { addAffinityTag, listAttachedTagIds } from "@/lib/affinity-tags";
import { listVocabTags } from "@/lib/vocab";
import { readActiveContext } from "@/lib/context";
import { consentLayerId } from "@/lib/simbee-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const layerKey = await readActiveContext();
  const layerId = layerKey ? await consentLayerId(layerKey) : null;

  const [vocab, attached] = await Promise.all([
    listVocabTags(),
    listAttachedTagIds(session.externalId, layerId ?? undefined),
  ]);

  return NextResponse.json({ vocab, attached_tag_ids: attached });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const json = (await request.json().catch(() => null)) as
    | { tag_id?: string; tag_type?: string }
    | null;
  if (!json?.tag_id || typeof json.tag_id !== "string") {
    return NextResponse.json({ error: "tag_id required." }, { status: 400 });
  }

  const tag = await addAffinityTag(
    session.externalId,
    json.tag_id,
    json.tag_type ?? "client",
  );
  if (!tag) {
    return NextResponse.json({ error: "Failed to add interest." }, { status: 502 });
  }
  return NextResponse.json({ tag }, { status: 201 });
}
