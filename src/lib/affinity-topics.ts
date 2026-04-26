import "server-only";
import { simbee } from "./simbee";
import type { components } from "./simbee-schema";

export type AffinityTopicDto = components["schemas"]["AffinityTopicDto"];
export type CreateAffinityTopic = components["schemas"]["CreateAffinityTopic"];

export async function addAffinityTopic(
  externalId: string,
  body: CreateAffinityTopic,
): Promise<AffinityTopicDto | null> {
  const res = await simbee().fetch.POST(
    "/api/v1/users/{external_id}/affinity/topics",
    {
      params: { path: { external_id: externalId } },
      body,
    },
  );
  return (res.data?.data as AffinityTopicDto | undefined) ?? null;
}

export async function removeAffinityTopic(
  externalId: string,
  affinityTopicId: string,
): Promise<boolean> {
  const res = await simbee().fetch.DELETE(
    "/api/v1/users/{external_id}/affinity/topics/{id}",
    {
      params: { path: { external_id: externalId, id: affinityTopicId } },
    },
  );
  return res.response.ok;
}
