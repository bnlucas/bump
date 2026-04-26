import "server-only";
import { simbee } from "./simbee";
import { ensureAffinity } from "./affinities";
import type { components } from "./simbee-schema";

export type ConsentDto = components["schemas"]["ConsentDto"];
export type ConsentLayerDto = components["schemas"]["ClientConsentLayerDto"];

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

export async function listConsents(externalId: string): Promise<ConsentDto[]> {
  const ids = await resolveSimbeeIds(externalId);
  if (!ids) return [];
  const res = await simbee().fetch.GET(
    "/api/v1/clients/{client_id}/users/{user_id}/consents",
    { params: { path: { client_id: ids.client_id, user_id: ids.user_id } } },
  );
  return (res.data?.data ?? []) as ConsentDto[];
}

export async function listConsentLayers(): Promise<ConsentLayerDto[]> {
  const res = await simbee().fetch.GET("/api/v1/config/consent_layers");
  return (res.data?.data ?? []) as ConsentLayerDto[];
}

export async function grantConsent(
  externalId: string,
  consent_type: string,
): Promise<ConsentDto | null> {
  const ids = await resolveSimbeeIds(externalId);
  if (!ids) return null;
  const res = await simbee().fetch.POST(
    "/api/v1/clients/{client_id}/users/{user_id}/consents",
    {
      params: { path: { client_id: ids.client_id, user_id: ids.user_id } },
      body: { consent_type },
    },
  );
  const consent = (res.data?.data as ConsentDto | undefined) ?? null;
  if (!consent) return null;

  // Each consent layer gets its own affinity — the user's interest profile
  // for that context. We resolve the layer by key so matches can compute.
  const layer = (await listConsentLayers()).find((l) => l.key === consent_type);
  if (layer) {
    await ensureAffinity(externalId, layer.id).catch(() => null);
  }

  return consent;
}

export async function revokeConsent(
  externalId: string,
  consentId: string,
): Promise<boolean> {
  const ids = await resolveSimbeeIds(externalId);
  if (!ids) return false;
  const res = await simbee().fetch.DELETE(
    "/api/v1/clients/{client_id}/users/{user_id}/consents/{id}",
    {
      params: {
        path: { client_id: ids.client_id, user_id: ids.user_id, id: consentId },
      },
    },
  );
  return res.response.ok;
}
