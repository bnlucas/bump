import "server-only";
import { simbeeRaw } from "./simbee-raw";
import type { components } from "./simbee-schema";

export type AffinityTagDto = components["schemas"]["AffinityTagDto"];
type UserDto = components["schemas"]["UserDto"];

// Returned by the internal /affinity_tags summary endpoint that the public
// spec doesn't model. Hand-rolled until it's promoted into the schema.
interface AffinityTagSummaryDto {
  id: string;
  tag_type?: string;
  association_type?: string;
}

interface ListEnvelope<T> {
  data: T[];
}

interface Envelope<T> {
  data: T;
}

async function resolveSimbeeIds(
  externalId: string,
): Promise<{ client_id: string; user_id: string } | null> {
  const res = await simbeeRaw<Envelope<UserDto>>(
    `/api/v1/users/${encodeURIComponent(externalId)}`,
  );
  if (!res.ok || !res.data?.data) return null;
  return { client_id: res.data.data.client_id, user_id: res.data.data.id };
}

/** Best-effort: returns the user's currently-attached affinity tag *vocab IDs*.
 *  The internal endpoint returns AffinityTagSummaryDto which we read as
 *  vocab tag ids (the field is named `id`, but in summary context it is the
 *  tag_id). If the shape doesn't match expectations or the call fails, we
 *  return an empty list and let the UI converge via writes. */
export async function listAttachedTagIds(
  externalId: string,
  consentLayerId?: string,
): Promise<string[]> {
  const ids = await resolveSimbeeIds(externalId);
  if (!ids) return [];
  const qs = consentLayerId ? `?consent_layer_id=${encodeURIComponent(consentLayerId)}` : "";
  const res = await simbeeRaw<ListEnvelope<AffinityTagSummaryDto>>(
    `/internal/v1/clients/${encodeURIComponent(ids.client_id)}/users/${encodeURIComponent(
      externalId,
    )}/affinity_tags${qs}`,
  );
  if (!res.ok) return [];
  return (res.data?.data ?? []).map((t) => t.id).filter(Boolean);
}

export async function addAffinityTag(
  externalId: string,
  tag_id: string,
  tag_type = "client",
): Promise<AffinityTagDto | null> {
  const res = await simbeeRaw<Envelope<AffinityTagDto>>(
    `/api/v1/users/${encodeURIComponent(externalId)}/affinity/tags`,
    { method: "POST", body: JSON.stringify({ tag_id, tag_type }) },
  );
  return res.ok ? (res.data?.data ?? null) : null;
}

export async function removeAffinityTag(
  externalId: string,
  affinityTagId: string,
): Promise<boolean> {
  const res = await simbeeRaw(
    `/api/v1/users/${encodeURIComponent(externalId)}/affinity/tags/${encodeURIComponent(
      affinityTagId,
    )}`,
    { method: "DELETE" },
  );
  return res.ok;
}
