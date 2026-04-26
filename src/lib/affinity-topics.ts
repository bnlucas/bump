import "server-only";
import { simbeeRaw } from "./simbee-raw";

export interface AffinityTopicDto {
  id: string;
  affinity_id: string;
  topic_id: string;
  topic_type: string;
  preference_id: string;
  role_id?: string;
  reference_id?: string;
  important?: boolean;
  must_have?: boolean;
}

export interface CreateAffinityTopic {
  topic_id: string;
  topic_type: string;
  preference_id: string;
  role_id?: string;
  reference_id?: string;
  important?: boolean;
  must_have?: boolean;
}

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
