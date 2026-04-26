import "server-only";
import { simbeeRaw } from "./simbee-raw";
import type { components } from "./simbee-schema";

export type ClientAffinityPreferenceDto =
  components["schemas"]["ClientAffinityPreferenceDto"];
export type ClientAffinityRoleDto = components["schemas"]["ClientAffinityRoleDto"];

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
