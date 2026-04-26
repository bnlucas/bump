import { describe, expect, it, vi, beforeEach } from "vitest";

const POST = vi.fn();
const GET = vi.fn();
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
  shroudb: () => ({ stash: {}, courier: {} }),
}));

vi.mock("./herald-admin", () => ({
  heraldAdmin: () => ({
    members: { list: vi.fn(), add: vi.fn() },
    streams: { get: vi.fn(), create: vi.fn() },
  }),
}));

vi.mock("./notifications", () => ({ notifyUser: vi.fn() }));

const { signalTypeId } = vi.hoisted(() => ({ signalTypeId: vi.fn() }));
vi.mock("./simbee-config", () => ({
  signalTypeId,
  consentLayerId: vi.fn(),
  SIGNAL_KEY_INTEREST: "interest",
  SIGNAL_KEY_PASS: "pass",
  CONSENT_LAYER_KEY: "dating",
}));

import { recordSwipe } from "./match";

beforeEach(() => {
  POST.mockReset();
  signalTypeId.mockReset();
});

describe("recordSwipe", () => {
  it("is a no-op when the configured signal_type key isn't provisioned", async () => {
    signalTypeId.mockResolvedValueOnce(null);
    await recordSwipe("me", "them", "right");
    expect(POST).not.toHaveBeenCalled();
  });

  it("posts +1 strength on right-swipe with the resolved signal_type_id", async () => {
    signalTypeId.mockResolvedValueOnce("type-uuid");
    POST.mockResolvedValueOnce({
      data: { data: {} },
      response: { ok: true } as Response,
    });
    await recordSwipe("me", "them", "right");
    expect(signalTypeId).toHaveBeenCalledWith("interest");
    expect(POST).toHaveBeenCalledWith(
      "/api/v1/users/{external_id}/signals",
      expect.objectContaining({
        params: { path: { external_id: "me" } },
        body: expect.objectContaining({
          external_id: "me",
          target_id: "them",
          target_type: "user",
          signal_type_id: "type-uuid",
          strength: 1,
        }),
      }),
    );
  });

  it("posts -1 strength on left-swipe with the pass signal type", async () => {
    signalTypeId.mockResolvedValueOnce("pass-uuid");
    POST.mockResolvedValueOnce({
      data: { data: {} },
      response: { ok: true } as Response,
    });
    await recordSwipe("me", "them", "left");
    expect(signalTypeId).toHaveBeenCalledWith("pass");
    expect(POST).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.objectContaining({ strength: -1 }),
      }),
    );
  });

  it("swallows POST failures so a transient signal write can't poison a swipe", async () => {
    signalTypeId.mockResolvedValueOnce("type-uuid");
    POST.mockRejectedValueOnce(new Error("network down"));
    await expect(recordSwipe("me", "them", "right")).resolves.toBeUndefined();
  });
});
