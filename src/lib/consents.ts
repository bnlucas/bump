import "server-only";
import { simbeeRaw } from "./simbee-raw";
import { ensureAffinity } from "./affinities";

export interface ConsentDto {
  id: string;
  client_user_id: string;
  consent_type: string;
  granted_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConsentLayerDto {
  id: string;
  client_id: string;
  key: string;
  consent_layer_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface UserDto {
  id: string;
  client_id: string;
  external_id: string;
}

interface Envelope<T> {
  data: T;
}

interface ListEnvelope<T> {
  data: T[];
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

export async function listConsents(externalId: string): Promise<ConsentDto[]> {
  const ids = await resolveSimbeeIds(externalId);
  if (!ids) return [];
  const res = await simbeeRaw<ListEnvelope<ConsentDto>>(
    `/api/v1/clients/${encodeURIComponent(ids.client_id)}/users/${encodeURIComponent(
      ids.user_id,
    )}/consents`,
  );
  if (!res.ok) return [];
  return res.data?.data ?? [];
}

export async function listConsentLayers(): Promise<ConsentLayerDto[]> {
  const res = await simbeeRaw<ListEnvelope<ConsentLayerDto>>(
    "/api/v1/config/consent_layers",
  );
  if (!res.ok) return [];
  return res.data?.data ?? [];
}

export async function grantConsent(
  externalId: string,
  consent_type: string,
): Promise<ConsentDto | null> {
  const ids = await resolveSimbeeIds(externalId);
  if (!ids) return null;
  const res = await simbeeRaw<Envelope<ConsentDto>>(
    `/api/v1/clients/${encodeURIComponent(ids.client_id)}/users/${encodeURIComponent(
      ids.user_id,
    )}/consents`,
    { method: "POST", body: JSON.stringify({ consent_type }) },
  );
  if (!res.ok || !res.data?.data) return null;

  // Each consent layer gets its own affinity — the user's interest profile
  // for that context. We resolve the layer by key so matches can compute.
  const layer = (await listConsentLayers()).find((l) => l.key === consent_type);
  if (layer) {
    await ensureAffinity(externalId, layer.id).catch(() => null);
  }

  return res.data.data;
}

export async function revokeConsent(
  externalId: string,
  consentId: string,
): Promise<boolean> {
  const ids = await resolveSimbeeIds(externalId);
  if (!ids) return false;
  const res = await simbeeRaw(
    `/api/v1/clients/${encodeURIComponent(ids.client_id)}/users/${encodeURIComponent(
      ids.user_id,
    )}/consents/${encodeURIComponent(consentId)}`,
    { method: "DELETE" },
  );
  return res.ok;
}
