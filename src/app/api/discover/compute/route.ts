import { NextResponse } from "next/server";
import { requireSession, isUnauthorized } from "@/lib/auth/guard";
import { requestMatchCompute } from "@/lib/match";
import { listConsents } from "@/lib/consents";
import { readActiveContext } from "@/lib/context";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await requireSession();
  if (isUnauthorized(session)) return session;

  const [granted, active] = await Promise.all([
    listConsents(session.externalId),
    readActiveContext(),
  ]);
  const grantedKeys = granted.map((c) => c.consent_type);
  const layerKey =
    active && grantedKeys.includes(active) ? active : (grantedKeys[0] ?? null);
  if (!layerKey) {
    return NextResponse.json(
      { error: "No consent layer to compute against." },
      { status: 400 },
    );
  }

  const ok = await requestMatchCompute(session.externalId, layerKey);
  if (!ok) {
    return NextResponse.json(
      { error: "Compute request failed." },
      { status: 502 },
    );
  }
  return NextResponse.json({ enqueued: true, layer: layerKey });
}
