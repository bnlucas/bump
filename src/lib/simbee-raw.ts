import "server-only";
import { env } from "./env";

const DEFAULT_HOST = "https://api.simbee.io";

export interface RawResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
}

export async function simbeeRaw<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<RawResponse<T>> {
  const host = (env.simbee.host ?? DEFAULT_HOST).replace(/\/$/, "");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${env.simbee.apiKey}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${host}${path}`, { ...init, headers });
  let data: T | null = null;
  if (res.headers.get("content-type")?.includes("application/json")) {
    data = (await res.json().catch(() => null)) as T | null;
  }
  return { ok: res.ok, status: res.status, data };
}
