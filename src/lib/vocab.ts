import "server-only";
import { simbeeRaw } from "./simbee-raw";
import type { components } from "./simbee-schema";

export type ClientTagDto = components["schemas"]["ClientTagDto"];
export type ClientTopicDto = components["schemas"]["ClientTopicDto"];

interface ListEnvelope<T> {
  data: T[];
}

export async function listVocabTags(limit = 200): Promise<ClientTagDto[]> {
  const res = await simbeeRaw<ListEnvelope<ClientTagDto>>(
    `/api/v1/vocab/tags?limit=${limit}`,
  );
  return res.ok ? (res.data?.data ?? []) : [];
}

export async function listVocabTopics(limit = 200): Promise<ClientTopicDto[]> {
  const res = await simbeeRaw<ListEnvelope<ClientTopicDto>>(
    `/api/v1/vocab/topics?limit=${limit}`,
  );
  return res.ok ? (res.data?.data ?? []) : [];
}
