import "server-only";
import createClient, { type Client } from "openapi-fetch";
import { env } from "./env";
import type { paths } from "./simbee-schema";

const DEFAULT_HOST = "https://api.simbee.io";

let instance: Client<paths> | null = null;

export function simbee(): { fetch: Client<paths> } {
  if (!instance) {
    const apiKey = env.simbee.apiKey;
    const baseUrl = env.simbee.host ?? DEFAULT_HOST;
    const client = createClient<paths>({ baseUrl });
    client.use({
      onRequest: ({ request }) => {
        request.headers.set("Authorization", `Bearer ${apiKey}`);
        return request;
      },
    });
    instance = client;
  }
  return { fetch: instance };
}

export type { paths, components } from "./simbee-schema";
