import "server-only";
import { ShrouDB } from "@shroudb/sdk";
import { env } from "./env";

let instance: ShrouDB | null = null;

export function shroudb(): ShrouDB {
  if (!instance) {
    instance = new ShrouDB({
      moat: env.shroudb.moat,
      token: env.shroudb.token,
    });
  }
  return instance;
}
