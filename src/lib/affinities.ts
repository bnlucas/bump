import "server-only";
import { simbeeRaw } from "./simbee-raw";

export interface AffinityDto {
  id: string;
  client_id: string;
  user_id: string;
  consent_layer_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface ListEnvelope<T> {
  data: T[];
}

interface Envelope<T> {
  data: T;
}

export async function listAffinities(externalId: string): Promise<AffinityDto[]> {
  const res = await simbeeRaw<ListEnvelope<AffinityDto>>(
    `/api/v1/users/${encodeURIComponent(externalId)}/affinity`,
  );
  return res.ok ? (res.data?.data ?? []) : [];
}

export async function createAffinity(
  externalId: string,
  consent_layer_id: string,
): Promise<AffinityDto | null> {
  const res = await simbeeRaw<Envelope<AffinityDto>>(
    `/api/v1/users/${encodeURIComponent(externalId)}/affinity`,
    { method: "POST", body: JSON.stringify({ consent_layer_id }) },
  );
  return res.ok ? (res.data?.data ?? null) : null;
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
