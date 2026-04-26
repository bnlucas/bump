import { beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

beforeAll(() => {
  process.env.HERALD_WS_URL = "wss://herald.test/ws";
  process.env.HERALD_HTTP_URL = "https://herald.test";
  process.env.HERALD_TENANT_KEY = "tenant-key";
  process.env.HERALD_TENANT_SECRET = "tenant-secret";
});

async function importMint() {
  const mod = await import("./herald-token");
  return mod.mintHeraldToken;
}

function expected(secret: string, userId: string, streams: string[], watchlist: string[]) {
  const sortedStreams = [...streams].sort();
  const sortedWatchlist = [...watchlist].sort();
  const payload = `${userId}:${sortedStreams.join(",")}:${sortedWatchlist.join(",")}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

describe("mintHeraldToken", () => {
  it("returns the configured url + key", async () => {
    const mintHeraldToken = await importMint();
    const creds = mintHeraldToken("u1", ["s1"]);
    expect(creds.url).toBe("wss://herald.test/ws");
    expect(creds.key).toBe("tenant-key");
    expect(creds.userId).toBe("u1");
  });

  it("sorts streams and watchlist into the signed payload", async () => {
    const mintHeraldToken = await importMint();
    const creds = mintHeraldToken("u1", ["b", "a"], ["z", "m"]);
    expect(creds.streams).toEqual(["a", "b"]);
    expect(creds.watchlist).toEqual(["m", "z"]);
    expect(creds.token).toBe(
      expected("tenant-secret", "u1", ["a", "b"], ["m", "z"]),
    );
  });

  it("is deterministic — same input produces same token", async () => {
    const mintHeraldToken = await importMint();
    const a = mintHeraldToken("u", ["s"]);
    const b = mintHeraldToken("u", ["s"]);
    expect(a.token).toBe(b.token);
  });

  it("differs when watchlist changes", async () => {
    const mintHeraldToken = await importMint();
    const a = mintHeraldToken("u", ["s"], []);
    const b = mintHeraldToken("u", ["s"], ["w"]);
    expect(a.token).not.toBe(b.token);
  });
});
