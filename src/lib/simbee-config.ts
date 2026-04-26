import "server-only";
import { simbeeRaw } from "./simbee-raw";

export const CONSENT_LAYER_KEY = process.env.SIMBEE_CONSENT_LAYER_KEY ?? "dating";
export const SIGNAL_KEY_INTEREST = process.env.SIMBEE_SIGNAL_KEY_INTEREST ?? "interest";
export const SIGNAL_KEY_PASS = process.env.SIMBEE_SIGNAL_KEY_PASS ?? "pass";

interface KeyedDto {
  id: string;
  key: string;
}

interface ListEnvelope<T> {
  data: T[];
}

const cache = new Map<string, Map<string, string>>();
const inflight = new Map<string, Promise<Map<string, string>>>();

async function loadKeyMap(path: string): Promise<Map<string, string>> {
  const cached = cache.get(path);
  if (cached) return cached;
  const pending = inflight.get(path);
  if (pending) return pending;

  const promise = (async () => {
    const res = await simbeeRaw<ListEnvelope<KeyedDto>>(path);
    const map = new Map<string, string>();
    if (res.ok && res.data?.data) {
      for (const item of res.data.data) {
        if (item?.key && item?.id) map.set(item.key, item.id);
      }
    }
    cache.set(path, map);
    inflight.delete(path);
    return map;
  })();

  inflight.set(path, promise);
  return promise;
}

export async function signalTypeId(key: string): Promise<string | null> {
  const map = await loadKeyMap("/api/v1/config/signal_types");
  return map.get(key) ?? null;
}

export async function consentLayerId(key: string): Promise<string | null> {
  const map = await loadKeyMap("/api/v1/config/consent_layers");
  return map.get(key) ?? null;
}
