import { describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const DELETE = vi.fn();

vi.mock("./simbee", () => ({
  simbee: () => ({ fetch: { GET, POST, PUT, DELETE } }),
}));

vi.mock("./sigil", () => ({
  SIGIL_USER_SCHEMA: "users",
  sigil: () => ({ userGet: vi.fn() }),
}));

vi.mock("./shroudb", () => ({
  shroudb: () => ({ stash: { retrieve: vi.fn(), store: vi.fn(), revoke: vi.fn() } }),
}));

vi.mock("./herald-admin", () => ({
  heraldAdmin: () => ({
    members: { list: vi.fn(), add: vi.fn() },
    streams: { get: vi.fn(), create: vi.fn() },
  }),
}));

vi.mock("./notifications", () => ({ notifyUser: vi.fn() }));

import { messagingAllowed } from "./match";

describe("messagingAllowed", () => {
  it("returns the upstream allowed flag and reason when present", async () => {
    GET.mockResolvedValueOnce({
      data: { data: { allowed: true } },
      response: { ok: true } as Response,
    });
    const a = await messagingAllowed("me", "them");
    expect(a).toEqual({ allowed: true, reason: undefined });

    GET.mockResolvedValueOnce({
      data: { data: { allowed: false, reason: "blocked" } },
      response: { ok: true } as Response,
    });
    const b = await messagingAllowed("me", "them");
    expect(b).toEqual({ allowed: false, reason: "blocked" });
  });

  it("falls back to a generic reason when upstream returns no permission", async () => {
    GET.mockResolvedValueOnce({
      data: undefined,
      response: { ok: false, status: 502 } as Response,
    });
    const r = await messagingAllowed("me", "them");
    expect(r).toEqual({ allowed: false, reason: "Permission check failed." });
  });

  it("hits the right path with both ids in the params", async () => {
    GET.mockResolvedValueOnce({
      data: { data: { allowed: true } },
      response: { ok: true } as Response,
    });
    await messagingAllowed("alice", "bob");
    expect(GET).toHaveBeenLastCalledWith(
      "/api/v1/users/{external_id}/messages/check/{recipient_external_id}",
      {
        params: {
          path: { external_id: "alice", recipient_external_id: "bob" },
        },
      },
    );
  });
});
