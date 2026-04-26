import "server-only";
import { simbee } from "./simbee";
import type { components } from "./simbee-schema";

export type ClientAffinityPreferenceDto =
  components["schemas"]["ClientAffinityPreferenceDto"];
export type ClientAffinityRoleDto = components["schemas"]["ClientAffinityRoleDto"];

export async function listAffinityPreferences(): Promise<ClientAffinityPreferenceDto[]> {
  const res = await simbee().fetch.GET("/api/v1/config/affinity_preferences");
  return (res.data?.data ?? []) as ClientAffinityPreferenceDto[];
}

export async function listAffinityRoles(): Promise<ClientAffinityRoleDto[]> {
  const res = await simbee().fetch.GET("/api/v1/config/affinity_roles");
  return (res.data?.data ?? []) as ClientAffinityRoleDto[];
}
