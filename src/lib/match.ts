import "server-only";
import { simbee, type components } from "./simbee";
import { simbeeRaw } from "./simbee-raw";
import { sigil, SIGIL_USER_SCHEMA } from "./sigil";
import { heraldAdmin } from "./herald-admin";
import {
  signalTypeId,
  consentLayerId,
  SIGNAL_KEY_INTEREST,
  SIGNAL_KEY_PASS,
} from "./simbee-config";

type MatchDto = components["schemas"]["DiscoveryMatchResultDto"];

export interface Candidate {
  external_id: string;
  display_name: string | null;
  bio: string | null;
  primary_photo_id: string | null;
  score: number;
  explanation: string[];
}

export type SwipeDirection = "right" | "left";

export interface Permission {
  allowed: boolean;
  reason?: string;
}

export interface ConversationSummary {
  stream_id: string;
  counterpart_id: string;
  display_name: string | null;
  primary_photo_id: string | null;
  score: number;
  matched_at: string;
}

interface PermissionEnvelope {
  data?: { allowed?: boolean; reason?: string };
}

interface UserEnvelope {
  data?: { external_id: string; traits?: Record<string, unknown> };
}

export function streamIdForPair(a: string, b: string): string {
  const [lo, hi] = [a, b].sort();
  return `match-${lo}-${hi}`;
}

export async function loadCandidates(
  externalId: string,
  layerKey: string | null,
  limit = 10,
): Promise<Candidate[]> {
  const res = await simbee().fetch.GET("/api/v1/users/{external_id}/matches", {
    params: { path: { external_id: externalId } },
  });
  if (!res.response.ok) return [];
  let matches = (res.data?.data ?? []) as MatchDto[];

  if (layerKey) {
    const layerId = await consentLayerId(layerKey);
    if (layerId) {
      matches = matches.filter((m) => m.consent_layer_id === layerId);
    }
  }

  return Promise.all(matches.slice(0, limit).map(hydrateCandidate));
}

function readPrimaryPhotoId(traits: Record<string, unknown>): string | null {
  const ids = traits.photo_ids;
  if (!Array.isArray(ids)) return null;
  const first = ids.find((v): v is string => typeof v === "string");
  return first ?? null;
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
    primary_photo_id: readPrimaryPhotoId(traits),
    score: m.score,
    explanation: m.explanation ?? [],
  };
}

export async function recordSwipe(
  externalId: string,
  targetId: string,
  direction: SwipeDirection,
): Promise<void> {
  const key = direction === "right" ? SIGNAL_KEY_INTEREST : SIGNAL_KEY_PASS;
  const id = await signalTypeId(key);
  if (!id) return;
  await simbee()
    .fetch.POST("/api/v1/users/{external_id}/signals", {
      params: { path: { external_id: externalId } },
      body: {
        external_id: externalId,
        target_id: targetId,
        target_type: "user",
        signal_type_id: id,
        strength: direction === "right" ? 1 : -1,
      },
    })
    .catch(() => {});
}

export async function messagingAllowed(meId: string, themId: string): Promise<Permission> {
  const res = await simbeeRaw<PermissionEnvelope>(
    `/api/v1/users/${encodeURIComponent(meId)}/messages/check/${encodeURIComponent(themId)}`,
  );
  if (!res.ok || !res.data?.data) {
    return { allowed: false, reason: "Permission check failed." };
  }
  return {
    allowed: Boolean(res.data.data.allowed),
    reason: res.data.data.reason,
  };
}

export interface OpenConversationResult extends Permission {
  stream_id: string | null;
}

export async function openConversation(
  meId: string,
  themId: string,
): Promise<OpenConversationResult> {
  const permission = await messagingAllowed(meId, themId);
  if (!permission.allowed) return { ...permission, stream_id: null };

  const streamId = streamIdForPair(meId, themId);
  const admin = heraldAdmin();

  const existing = await admin.streams.get(streamId).catch(() => null);
  if (!existing) {
    await admin.streams.create(streamId, `match:${streamId}`);
  }
  const members = await admin.members.list(streamId).catch(() => []);
  const memberIds = new Set(members.map((m) => m.user_id));
  const adds: Promise<unknown>[] = [];
  if (!memberIds.has(meId)) adds.push(admin.members.add(streamId, meId));
  if (!memberIds.has(themId)) adds.push(admin.members.add(streamId, themId));
  await Promise.all(adds);

  return { allowed: true, stream_id: streamId };
}

export async function listConversations(
  meId: string,
  layerKey: string | null = null,
): Promise<ConversationSummary[]> {
  const res = await simbee().fetch.GET("/api/v1/users/{external_id}/matches", {
    params: { path: { external_id: meId } },
  });
  if (!res.response.ok) return [];
  let matches = (res.data?.data ?? []) as MatchDto[];

  if (layerKey) {
    const layerId = await consentLayerId(layerKey);
    if (layerId) {
      matches = matches.filter((m) => m.consent_layer_id === layerId);
    }
  }

  const checks = await Promise.all(
    matches.map(async (m) => {
      const permission = await messagingAllowed(meId, m.matched_user_id);
      if (!permission.allowed) return null;
      const [envelope, userRes] = await Promise.all([
        sigil().userGet(SIGIL_USER_SCHEMA, m.matched_user_id).catch(() => null),
        simbee().fetch.GET("/api/v1/users/{external_id}", {
          params: { path: { external_id: m.matched_user_id } },
        }),
      ]);
      const fields = (envelope?.fields ?? {}) as Record<string, unknown>;
      const traits = (userRes.data?.data?.traits ?? {}) as Record<string, unknown>;
      return {
        stream_id: streamIdForPair(meId, m.matched_user_id),
        counterpart_id: m.matched_user_id,
        display_name:
          typeof fields.display_name === "string" ? fields.display_name : null,
        primary_photo_id: readPrimaryPhotoId(traits),
        score: m.score,
        matched_at: m.matched_at,
      } satisfies ConversationSummary;
    }),
  );
  return checks.filter((c): c is ConversationSummary => c !== null);
}

export async function counterpartId(streamId: string, meId: string): Promise<string | null> {
  const members = await heraldAdmin()
    .members.list(streamId)
    .catch(() => []);
  return members.find((m) => m.user_id !== meId)?.user_id ?? null;
}

// Re-exported helpers used by API routes that need to re-fetch a single profile.
export async function userBasic(externalId: string): Promise<{
  external_id: string;
  display_name: string | null;
  primary_photo_id: string | null;
} | null> {
  const userRes = await simbeeRaw<UserEnvelope>(
    `/api/v1/users/${encodeURIComponent(externalId)}`,
  );
  if (!userRes.ok || !userRes.data?.data) return null;
  const envelope = await sigil()
    .userGet(SIGIL_USER_SCHEMA, externalId)
    .catch(() => null);
  const fields = (envelope?.fields ?? {}) as Record<string, unknown>;
  const traits = (userRes.data.data.traits ?? {}) as Record<string, unknown>;
  return {
    external_id: externalId,
    display_name: typeof fields.display_name === "string" ? fields.display_name : null,
    primary_photo_id: readPrimaryPhotoId(traits),
  };
}
