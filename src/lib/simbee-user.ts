import "server-only";
import { simbee } from "./simbee";

const externalToInternal = new Map<string, string>();

export async function resolveInternalUserId(
  externalId: string,
): Promise<string | null> {
  const cached = externalToInternal.get(externalId);
  if (cached) return cached;
  const res = await simbee().fetch.GET("/api/v1/users/{external_id}", {
    params: { path: { external_id: externalId } },
  });
  const id = res.data?.data?.id ?? null;
  if (id) externalToInternal.set(externalId, id);
  return id;
}
