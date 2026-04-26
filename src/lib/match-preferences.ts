import "server-only";
import { simbee } from "./simbee";
import type { components } from "./simbee-schema";

export type MatchPreferences = components["schemas"]["MatchPreferencesDto"];

export async function loadMatchPreferences(
  externalId: string,
): Promise<MatchPreferences> {
  const res = await simbee().fetch.GET(
    "/api/v1/users/{external_id}/match_preferences",
    { params: { path: { external_id: externalId } } },
  );
  return (res.data?.data ?? {}) as MatchPreferences;
}
