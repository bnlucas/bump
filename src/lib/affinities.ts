import "server-only";
import { simbee } from "./simbee";
import type { components } from "./simbee-schema";

export type AffinityDto = components["schemas"]["AffinityDto"];

export async function listAffinities(externalId: string): Promise<AffinityDto[]> {
  const res = await simbee().fetch.GET("/api/v1/users/{external_id}/affinity", {
    params: { path: { external_id: externalId } },
  });
  return (res.data?.data ?? []) as AffinityDto[];
}

export async function createAffinity(
  externalId: string,
  consent_layer_id: string,
): Promise<AffinityDto | null> {
  const res = await simbee().fetch.POST("/api/v1/users/{external_id}/affinity", {
    params: { path: { external_id: externalId } },
    body: { consent_layer_id },
  });
  return (res.data?.data as AffinityDto | undefined) ?? null;
}

export async function ensureAffinity(
  externalId: string,
  consent_layer_id: string,
): Promise<AffinityDto | null> {
  const existing = await listAffinities(externalId);
  const match = existing.find((a) => a.consent_layer_id === consent_layer_id);
  if (match) return match;
  return createAffinity(externalId, consent_layer_id);
}
