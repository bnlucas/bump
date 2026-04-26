import "server-only";
import { simbee } from "./simbee";
import { simbeeRaw } from "./simbee-raw";
import type { components } from "./simbee-schema";

export type AffinityTagDto = components["schemas"]["AffinityTagDto"];

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

async function resolveSimbeeIds(
  externalId: string,
): Promise<{ client_id: string; user_id: string } | null> {
  const res = await simbee().fetch.GET("/api/v1/users/{external_id}", {
    params: { path: { external_id: externalId } },
  });
  const user = res.data?.data;
  if (!user) return null;
  return { client_id: user.client_id, user_id: user.id };
}

/** Best-effort: returns the user's currently-attached affinity tag *vocab IDs*.
 *  The internal endpoint isn't in the public spec, so this stays on simbeeRaw.
 *  Summary's `id` is interpreted as the vocab tag id; if the shape doesn't
 *  match expectations the call fails and we return an empty list, letting the
 *  UI converge via writes. */
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
  const res = await simbee().fetch.POST(
    "/api/v1/users/{external_id}/affinity/tags",
    {
      params: { path: { external_id: externalId } },
      body: { tag_id, tag_type },
    },
  );
  return (res.data?.data as AffinityTagDto | undefined) ?? null;
}

export async function removeAffinityTag(
  externalId: string,
  affinityTagId: string,
): Promise<boolean> {
  const res = await simbee().fetch.DELETE(
    "/api/v1/users/{external_id}/affinity/tags/{id}",
    {
      params: { path: { external_id: externalId, id: affinityTagId } },
    },
  );
  return res.response.ok;
}
