import "server-only";
import { simbeeRaw } from "./simbee-raw";
import type { components } from "./simbee-schema";

export type AffinityTopicDto = components["schemas"]["AffinityTopicDto"];
export type CreateAffinityTopic = components["schemas"]["CreateAffinityTopic"];

interface Envelope<T> {
  data: T;
}

export async function addAffinityTopic(
  externalId: string,
  body: CreateAffinityTopic,
): Promise<AffinityTopicDto | null> {
  const res = await simbeeRaw<Envelope<AffinityTopicDto>>(
    `/api/v1/users/${encodeURIComponent(externalId)}/affinity/topics`,
    { method: "POST", body: JSON.stringify(body) },
  );
  return res.ok ? (res.data?.data ?? null) : null;
}

export async function removeAffinityTopic(
  externalId: string,
  affinityTopicId: string,
): Promise<boolean> {
  const res = await simbeeRaw(
    `/api/v1/users/${encodeURIComponent(externalId)}/affinity/topics/${encodeURIComponent(
      affinityTopicId,
    )}`,
    { method: "DELETE" },
  );
  return res.ok;
}
