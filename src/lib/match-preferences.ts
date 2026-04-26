import "server-only";
import { simbeeRaw } from "./simbee-raw";
import type { components } from "./simbee-schema";

export type MatchPreferences = components["schemas"]["MatchPreferencesDto"];

export async function loadMatchPreferences(
  externalId: string,
): Promise<MatchPreferences> {
  const res = await simbeeRaw<{ data: MatchPreferences }>(
    `/api/v1/users/${encodeURIComponent(externalId)}/match_preferences`,
  );
  return res.ok && res.data?.data ? res.data.data : {};
}
