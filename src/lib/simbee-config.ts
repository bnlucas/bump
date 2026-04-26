import "server-only";
import { simbee } from "./simbee";

export const CONSENT_LAYER_KEY = process.env.SIMBEE_CONSENT_LAYER_KEY ?? "dating";
export const SIGNAL_KEY_INTEREST = process.env.SIMBEE_SIGNAL_KEY_INTEREST ?? "interest";
export const SIGNAL_KEY_PASS = process.env.SIMBEE_SIGNAL_KEY_PASS ?? "pass";

interface Keyed {
  id: string;
  key: string;
}

const cache = new Map<string, Map<string, string>>();
const inflight = new Map<string, Promise<Map<string, string>>>();

async function loadKeyMap(
  cacheKey: string,
  load: () => Promise<Keyed[]>,
): Promise<Map<string, string>> {
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const promise = (async () => {
    const items = await load();
    const map = new Map<string, string>();
    for (const item of items) {
      if (item?.key && item?.id) map.set(item.key, item.id);
    }
    cache.set(cacheKey, map);
    inflight.delete(cacheKey);
    return map;
  })();

  inflight.set(cacheKey, promise);
  return promise;
}

export async function signalTypeId(key: string): Promise<string | null> {
  const map = await loadKeyMap("signal_types", async () => {
    const res = await simbee().fetch.GET("/api/v1/config/signal_types");
    return (res.data?.data ?? []) as Keyed[];
  });
  return map.get(key) ?? null;
}

export async function consentLayerId(key: string): Promise<string | null> {
  const map = await loadKeyMap("consent_layers", async () => {
    const res = await simbee().fetch.GET("/api/v1/config/consent_layers");
    return (res.data?.data ?? []) as Keyed[];
  });
  return map.get(key) ?? null;
}
