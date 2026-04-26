import "server-only";
import { createHmac } from "node:crypto";
import { env } from "./env";

export interface HeraldClientCreds {
  url: string;
  key: string;
  token: string;
  userId: string;
  streams: string[];
  watchlist: string[];
}

export function mintHeraldToken(
  userId: string,
  streams: string[],
  watchlist: string[] = [],
): HeraldClientCreds {
  const sortedStreams = [...streams].sort();
  const sortedWatchlist = [...watchlist].sort();
  const payload = `${userId}:${sortedStreams.join(",")}:${sortedWatchlist.join(",")}`;
  const token = createHmac("sha256", env.herald.tenantSecret)
    .update(payload)
    .digest("hex");

  return {
    url: env.herald.wsUrl,
    key: env.herald.tenantKey,
    token,
    userId,
    streams: sortedStreams,
    watchlist: sortedWatchlist,
  };
}
