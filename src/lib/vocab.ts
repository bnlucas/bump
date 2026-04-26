import "server-only";
import { simbeeRaw } from "./simbee-raw";

export interface ClientTagDto {
  id: string;
  client_id: string;
  category_id: string;
  name: string;
  system_tag_id?: string;
  active?: boolean;
}

interface ListEnvelope<T> {
  data: T[];
}

export async function listVocabTags(limit = 200): Promise<ClientTagDto[]> {
  const res = await simbeeRaw<ListEnvelope<ClientTagDto>>(
    `/api/v1/vocab/tags?limit=${limit}`,
  );
  return res.ok ? (res.data?.data ?? []) : [];
}
