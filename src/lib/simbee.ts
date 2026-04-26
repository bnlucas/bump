import "server-only";
import { SimbeeClient } from "@simbee-io/sdk";
import { env } from "./env";

let instance: SimbeeClient | null = null;

export function simbee(): SimbeeClient {
  if (!instance) {
    instance = new SimbeeClient({
      apiKey: env.simbee.apiKey,
      host: env.simbee.host,
    });
  }
  return instance;
}

export type { paths, components } from "@simbee-io/sdk";
