import "server-only";
import { shroudb } from "./shroudb";

export const SIGIL_USER_SCHEMA = "users";

export function sigil() {
  return shroudb().sigil;
}
