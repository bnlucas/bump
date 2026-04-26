import "server-only";
import { simbeeRaw } from "./simbee-raw";

export interface ClientAffinityPreferenceDto {
  id: string;
  client_id: string;
  key: string;
  affinity_preference_id?: string;
}

export interface ClientAffinityRoleDto {
  id: string;
  client_id: string;
  key: string;
  affinity_role_id?: string;
}

interface ListEnvelope<T> {
  data: T[];
}

export async function listAffinityPreferences(): Promise<ClientAffinityPreferenceDto[]> {
  const res = await simbeeRaw<ListEnvelope<ClientAffinityPreferenceDto>>(
    "/api/v1/config/affinity_preferences",
  );
  return res.ok ? (res.data?.data ?? []) : [];
}

export async function listAffinityRoles(): Promise<ClientAffinityRoleDto[]> {
  const res = await simbeeRaw<ListEnvelope<ClientAffinityRoleDto>>(
    "/api/v1/config/affinity_roles",
  );
  return res.ok ? (res.data?.data ?? []) : [];
}
