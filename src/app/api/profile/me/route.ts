import { NextResponse, type NextRequest } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { loadProfile, updateProfile, type ProfileUpdate } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const profile = await loadProfile(session.externalId);
  return NextResponse.json(profile);
}

function parsePatch(value: unknown): ProfileUpdate | { error: string } {
  if (!value || typeof value !== "object") return { error: "Body must be a JSON object." };
  const v = value as Record<string, unknown>;
  const patch: ProfileUpdate = {};
  if (v.display_name !== undefined) {
    if (typeof v.display_name !== "string") return { error: "display_name must be a string." };
    if (v.display_name.length > 80) return { error: "display_name too long (max 80)." };
    patch.display_name = v.display_name;
  }
  if (v.bio !== undefined) {
    if (typeof v.bio !== "string") return { error: "bio must be a string." };
    if (v.bio.length > 500) return { error: "bio too long (max 500)." };
    patch.bio = v.bio;
  }
  return patch;
}

export async function PUT(request: NextRequest) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const json = await request.json().catch(() => null);
  const parsed = parsePatch(json);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const profile = await updateProfile(session.externalId, parsed);
  return NextResponse.json(profile);
}
