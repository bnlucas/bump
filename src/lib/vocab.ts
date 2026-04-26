import "server-only";
import { simbee } from "./simbee";
import type { components } from "./simbee-schema";

export type ClientTagDto = components["schemas"]["ClientTagDto"];
export type ClientTopicDto = components["schemas"]["ClientTopicDto"];

export async function listVocabTags(limit = 200): Promise<ClientTagDto[]> {
  const res = await simbee().fetch.GET("/api/v1/vocab/tags", {
    params: { query: { limit } },
  });
  return (res.data?.data ?? []) as ClientTagDto[];
}

export async function listVocabTopics(limit = 200): Promise<ClientTopicDto[]> {
  const res = await simbee().fetch.GET("/api/v1/vocab/topics", {
    params: { query: { limit } },
  });
  return (res.data?.data ?? []) as ClientTopicDto[];
}
