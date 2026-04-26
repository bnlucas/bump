import "server-only";
import { HeraldAdmin } from "@skeptik-io/herald-admin";
import { env } from "./env";

let instance: HeraldAdmin | null = null;

export function heraldAdmin(): HeraldAdmin {
  if (!instance) {
    instance = new HeraldAdmin({
      url: env.herald.httpUrl,
      key: env.herald.tenantKey,
      secret: env.herald.tenantSecret,
    });
  }
  return instance;
}
