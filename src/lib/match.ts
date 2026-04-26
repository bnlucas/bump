import "server-only";
import { simbee, type components } from "./simbee";
import { sigil, SIGIL_USER_SCHEMA } from "./sigil";
import { heraldAdmin } from "./herald-admin";

const SIGNAL_TYPE_INTEREST = process.env.SIMBEE_SIGNAL_TYPE_INTEREST;
const SIGNAL_TYPE_PASS = process.env.SIMBEE_SIGNAL_TYPE_PASS;

export interface Candidate {
  external_id: string;
  display_name: string | null;
  bio: string | null;
  score: number;
  explanation: string[];
}

type MatchDto = components["schemas"]["DiscoveryMatchResultDto"];

export async function loadCandidates(externalId: string, limit = 10): Promise<Candidate[]> {
  const res = await simbee().fetch.GET("/api/v1/users/{external_id}/matches", {
    params: { path: { external_id: externalId } },
  });
  if (!res.response.ok) return [];
  const matches = (res.data?.data ?? []) as MatchDto[];

  const candidates = await Promise.all(
    matches.slice(0, limit).map(async (m) => hydrateCandidate(m)),
  );
  return candidates;
}

async function hydrateCandidate(m: MatchDto): Promise<Candidate> {
  const targetId = m.matched_user_id;
  const [envelope, userRes] = await Promise.all([
    sigil().userGet(SIGIL_USER_SCHEMA, targetId).catch(() => null),
    simbee().fetch.GET("/api/v1/users/{external_id}", {
      params: { path: { external_id: targetId } },
    }),
  ]);
  const fields = (envelope?.fields ?? {}) as Record<string, unknown>;
  const traits = (userRes.data?.data?.traits ?? {}) as Record<string, unknown>;
  return {
    external_id: targetId,
    display_name: typeof fields.display_name === "string" ? fields.display_name : null,
    bio: typeof traits.bio === "string" ? traits.bio : null,
    score: m.score,
    explanation: m.explanation ?? [],
  };
}

export type SwipeDirection = "right" | "left";

export async function recordSwipe(
  externalId: string,
  targetId: string,
  direction: SwipeDirection,
): Promise<void> {
  const signalTypeId =
    direction === "right" ? SIGNAL_TYPE_INTEREST : SIGNAL_TYPE_PASS;
  if (!signalTypeId) return;
  await simbee()
    .fetch.POST("/api/v1/users/{external_id}/signals", {
      params: { path: { external_id: externalId } },
      body: {
        external_id: externalId,
        target_id: targetId,
        target_type: "user",
        signal_type_id: signalTypeId,
        strength: direction === "right" ? 1 : -1,
      },
    })
    .catch(() => {});
}

export function streamIdForPair(a: string, b: string): string {
  const [lo, hi] = [a, b].sort();
  return `match-${lo}-${hi}`;
}

async function getTraits(externalId: string): Promise<Record<string, unknown>> {
  const res = await simbee().fetch.GET("/api/v1/users/{external_id}", {
    params: { path: { external_id: externalId } },
  });
  return (res.data?.data?.traits ?? {}) as Record<string, unknown>;
}

async function pushStreamIdToTraits(externalId: string, streamId: string): Promise<void> {
  const traits = await getTraits(externalId);
  const current = Array.isArray(traits.stream_ids) ? (traits.stream_ids as unknown[]) : [];
  if (current.includes(streamId)) return;
  const nextTraits = { ...traits, stream_ids: [...current, streamId] };
  await simbee().fetch.PUT("/api/v1/users/{external_id}", {
    params: { path: { external_id: externalId } },
    body: { traits: nextTraits as unknown as Record<string, never> },
  });
}

export async function openMatchStream(
  externalId: string,
  targetId: string,
): Promise<string> {
  const streamId = streamIdForPair(externalId, targetId);
  const admin = heraldAdmin();

  const existing = await admin.streams.get(streamId).catch(() => null);
  if (!existing) {
    await admin.streams.create(streamId, `match:${streamId}`);
  }

  const members = await admin.members.list(streamId).catch(() => []);
  const memberIds = new Set(members.map((m) => m.user_id));
  const adds: Promise<unknown>[] = [];
  if (!memberIds.has(externalId)) adds.push(admin.members.add(streamId, externalId));
  if (!memberIds.has(targetId)) adds.push(admin.members.add(streamId, targetId));
  await Promise.all(adds);

  await Promise.all([
    pushStreamIdToTraits(externalId, streamId),
    pushStreamIdToTraits(targetId, streamId),
  ]);

  return streamId;
}

export async function userStreamIds(externalId: string): Promise<string[]> {
  const traits = await getTraits(externalId);
  const ids = Array.isArray(traits.stream_ids) ? (traits.stream_ids as unknown[]) : [];
  return ids.filter((x): x is string => typeof x === "string");
}
