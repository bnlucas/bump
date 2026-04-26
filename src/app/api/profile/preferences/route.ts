import { NextResponse, type NextRequest } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { simbee, type components } from "@/lib/simbee";

export const dynamic = "force-dynamic";

type Preferences = components["schemas"]["DiscoveryUpdateMatchPreferences"];

const STRING_LIST_KEYS = ["preferred_genders", "preferred_connections", "connection_types"] as const;

function parsePreferences(value: unknown): Preferences | { error: string } {
  if (!value || typeof value !== "object") return { error: "Body must be a JSON object." };
  const v = value as Record<string, unknown>;
  const out: Preferences = {};

  if (v.accept_matches !== undefined) {
    if (typeof v.accept_matches !== "boolean") return { error: "accept_matches must be boolean." };
    out.accept_matches = v.accept_matches;
  }
  for (const k of ["age_min", "age_max"] as const) {
    if (v[k] !== undefined) {
      if (typeof v[k] !== "number" || !Number.isFinite(v[k])) return { error: `${k} must be a number.` };
      out[k] = v[k] as number;
    }
  }
  for (const k of ["location", "gender"] as const) {
    if (v[k] !== undefined) {
      if (typeof v[k] !== "string") return { error: `${k} must be a string.` };
      out[k] = v[k] as string;
    }
  }
  for (const k of STRING_LIST_KEYS) {
    if (v[k] !== undefined) {
      if (!Array.isArray(v[k]) || !(v[k] as unknown[]).every((s) => typeof s === "string")) {
        return { error: `${k} must be a string array.` };
      }
      out[k] = v[k] as string[];
    }
  }
  return out;
}

export async function GET() {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const res = await simbee().fetch.GET("/api/v1/users/{external_id}/match_preferences", {
    params: { path: { external_id: session.externalId } },
  });
  if (!res.response.ok) {
    return NextResponse.json({ error: "Failed to load preferences." }, { status: 502 });
  }
  return NextResponse.json(res.data?.data ?? {});
}

export async function PUT(request: NextRequest) {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const json = await request.json().catch(() => null);
  const parsed = parsePreferences(json);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const res = await simbee().fetch.PUT("/api/v1/users/{external_id}/match_preferences", {
    params: { path: { external_id: session.externalId } },
    body: parsed,
  });
  if (!res.response.ok) {
    return NextResponse.json({ error: "Failed to save preferences." }, { status: 502 });
  }
  return NextResponse.json(res.data?.data ?? {});
}
