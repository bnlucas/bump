import { NextResponse, type NextRequest } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { addPhoto, listPhotoIds } from "@/lib/photos";

export const dynamic = "force-dynamic";

const MAX_BYTES = 6 * 1024 * 1024; // ~4.5MB image after base64 overhead
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

interface UploadBody {
  data_b64: string;
  content_type: string;
}

function stripDataUrl(s: string): string {
  const m = s.match(/^data:[^;,]+;base64,(.*)$/);
  return m ? m[1] : s;
}

function parseBody(value: unknown): UploadBody | { error: string } {
  if (!value || typeof value !== "object") return { error: "Body must be a JSON object." };
  const v = value as Record<string, unknown>;
  if (typeof v.data_b64 !== "string" || !v.data_b64) return { error: "data_b64 required." };
  if (typeof v.content_type !== "string" || !ALLOWED.has(v.content_type)) {
    return { error: "Unsupported image type." };
  }
  const data_b64 = stripDataUrl(v.data_b64);
  if (data_b64.length > MAX_BYTES) return { error: "Image is too large." };
  return { data_b64, content_type: v.content_type };
}

export async function GET() {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;
  const ids = await listPhotoIds(session.externalId);
  return NextResponse.json({ photo_ids: ids });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const json = await request.json().catch(() => null);
  const parsed = parseBody(json);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const photoId = await addPhoto(session.externalId, parsed.data_b64, parsed.content_type);
  return NextResponse.json({ photo_id: photoId }, { status: 201 });
}
