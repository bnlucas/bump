import { describe, expect, it, vi, beforeEach } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const DELETE = vi.fn();
const userGet = vi.fn();

vi.mock("./simbee", () => ({
  simbee: () => ({ fetch: { GET, POST, PUT, DELETE } }),
}));

vi.mock("./sigil", () => ({
  SIGIL_USER_SCHEMA: "users",
  sigil: () => ({ userGet }),
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

const { signalTypeId, consentLayerId } = vi.hoisted(() => ({
  signalTypeId: vi.fn(),
  consentLayerId: vi.fn(),
}));
vi.mock("./simbee-config", () => ({
  signalTypeId,
  consentLayerId,
  SIGNAL_KEY_INTEREST: "interest",
  SIGNAL_KEY_PASS: "pass",
  CONSENT_LAYER_KEY: "dating",
}));

import { loadCandidates } from "./match";

beforeEach(() => {
  GET.mockReset();
  userGet.mockReset();
  consentLayerId.mockReset();
});

function matchesResponse(matches: Array<Record<string, unknown>>) {
  return {
    data: { data: matches },
    response: { ok: true } as Response,
  };
}

function userResponse(externalId: string, traits: Record<string, unknown> = {}) {
  return {
    data: {
      data: {
        id: `internal-${externalId}`,
        client_id: "tenant",
        external_id: externalId,
        traits,
      },
    },
    response: { ok: true } as Response,
  };
}

describe("loadCandidates", () => {
  it("filters MatchResultDtos by the resolved consent_layer_id when a layer key is given", async () => {
    consentLayerId.mockResolvedValueOnce("layer-A");
    GET
      // Matches list — three results across two layers
      .mockResolvedValueOnce(
        matchesResponse([
          { matched_user_id: "u1", score: 0.9, consent_layer_id: "layer-A" },
          { matched_user_id: "u2", score: 0.7, consent_layer_id: "layer-B" },
          { matched_user_id: "u3", score: 0.6, consent_layer_id: "layer-A" },
        ]),
      )
      // Per-candidate user lookups (in candidate order: u1, u3)
      .mockResolvedValueOnce(userResponse("u1"))
      .mockResolvedValueOnce(userResponse("u3"));

    userGet.mockResolvedValue(null);

    const result = await loadCandidates("me", "dating");

    expect(result.map((c) => c.external_id)).toEqual(["u1", "u3"]);
    expect(consentLayerId).toHaveBeenCalledWith("dating");
  });

  it("returns all matches unfiltered when layerKey is null", async () => {
    GET
      .mockResolvedValueOnce(
        matchesResponse([
          { matched_user_id: "u1", score: 0.9, consent_layer_id: "layer-A" },
          { matched_user_id: "u2", score: 0.7, consent_layer_id: "layer-B" },
        ]),
      )
      .mockResolvedValueOnce(userResponse("u1"))
      .mockResolvedValueOnce(userResponse("u2"));
    userGet.mockResolvedValue(null);

    const result = await loadCandidates("me", null);

    expect(result.map((c) => c.external_id)).toEqual(["u1", "u2"]);
    expect(consentLayerId).not.toHaveBeenCalled();
  });

  it("does not filter when the layer key fails to resolve", async () => {
    consentLayerId.mockResolvedValueOnce(null);
    GET
      .mockResolvedValueOnce(
        matchesResponse([
          { matched_user_id: "u1", score: 0.9, consent_layer_id: "layer-A" },
          { matched_user_id: "u2", score: 0.7, consent_layer_id: "layer-B" },
        ]),
      )
      .mockResolvedValueOnce(userResponse("u1"))
      .mockResolvedValueOnce(userResponse("u2"));
    userGet.mockResolvedValue(null);

    const result = await loadCandidates("me", "made-up-layer");
    expect(result.map((c) => c.external_id)).toEqual(["u1", "u2"]);
  });

  it("returns [] when the matches endpoint fails", async () => {
    GET.mockResolvedValueOnce({
      data: undefined,
      response: { ok: false, status: 500 } as Response,
    });
    const result = await loadCandidates("me", null);
    expect(result).toEqual([]);
  });
});
