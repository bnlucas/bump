import "server-only";
import { simbeeRaw } from "./simbee-raw";
import type { components } from "./simbee-schema";

type UserDto = components["schemas"]["UserDto"];

const externalToInternal = new Map<string, string>();

export async function resolveInternalUserId(
  externalId: string,
): Promise<string | null> {
  const cached = externalToInternal.get(externalId);
  if (cached) return cached;
  const res = await simbeeRaw<{ data: UserDto }>(
    `/api/v1/users/${encodeURIComponent(externalId)}`,
  );
  const id = res.ok ? res.data?.data?.id : null;
  if (id) externalToInternal.set(externalId, id);
  return id ?? null;
}
