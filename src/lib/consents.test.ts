import { describe, expect, it, vi, beforeEach } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const DELETE = vi.fn();

vi.mock("./simbee", () => ({
  simbee: () => ({ fetch: { GET, POST, PUT, DELETE } }),
}));

const { ensureAffinity } = vi.hoisted(() => ({ ensureAffinity: vi.fn() }));
vi.mock("./affinities", () => ({ ensureAffinity }));

import { grantConsent, listConsents, revokeConsent } from "./consents";

beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
  DELETE.mockReset();
  ensureAffinity.mockReset();
});

const ME = "alice";
const USER_RESPONSE = {
  data: {
    data: {
      id: "internal-alice",
      client_id: "tenant-x",
      external_id: ME,
    },
  },
  response: { ok: true } as Response,
};

function listResponse<T>(items: T[]) {
  return {
    data: { data: items },
    response: { ok: true } as Response,
  };
}

function envelopeResponse(item: Record<string, unknown>) {
  return {
    data: { data: item },
    response: { ok: true } as Response,
  };
}

describe("listConsents", () => {
  it("resolves the simbee client_id + user_id and lists against /clients/{cid}/users/{uid}/consents", async () => {
    GET.mockResolvedValueOnce(USER_RESPONSE).mockResolvedValueOnce(
      listResponse([{ id: "c1", consent_type: "dating", granted_at: "2026-01-01T00:00:00Z" }]),
    );
    const result = await listConsents(ME);
    expect(GET.mock.calls[0]).toEqual([
      "/api/v1/users/{external_id}",
      { params: { path: { external_id: ME } } },
    ]);
    expect(GET.mock.calls[1]).toEqual([
      "/api/v1/clients/{client_id}/users/{user_id}/consents",
      { params: { path: { client_id: "tenant-x", user_id: "internal-alice" } } },
    ]);
    expect(result).toEqual([
      { id: "c1", consent_type: "dating", granted_at: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("returns [] when the user lookup fails", async () => {
    GET.mockResolvedValueOnce({
      data: undefined,
      response: { ok: false, status: 404 } as Response,
    });
    expect(await listConsents(ME)).toEqual([]);
    expect(GET).toHaveBeenCalledTimes(1);
  });
});

describe("grantConsent", () => {
  it("creates the consent and ensures a matching affinity for the layer's id", async () => {
    GET.mockResolvedValueOnce(USER_RESPONSE)
      // After the POST, grantConsent calls listConsentLayers via /config/consent_layers
      .mockResolvedValueOnce(
        listResponse([
          { id: "layer-id-A", key: "dating" },
          { id: "layer-id-B", key: "community" },
        ]),
      );
    POST.mockResolvedValueOnce(
      envelopeResponse({ id: "c1", consent_type: "dating", granted_at: "2026-04-26T00:00:00Z" }),
    );
    ensureAffinity.mockResolvedValueOnce({ id: "aff-1" });

    const result = await grantConsent(ME, "dating");

    expect(POST).toHaveBeenCalledWith(
      "/api/v1/clients/{client_id}/users/{user_id}/consents",
      expect.objectContaining({
        params: {
          path: { client_id: "tenant-x", user_id: "internal-alice" },
        },
        body: { consent_type: "dating" },
      }),
    );
    expect(ensureAffinity).toHaveBeenCalledWith(ME, "layer-id-A");
    expect(result?.consent_type).toBe("dating");
  });

  it("returns null without calling ensureAffinity when the consent POST fails", async () => {
    GET.mockResolvedValueOnce(USER_RESPONSE);
    POST.mockResolvedValueOnce({
      data: undefined,
      response: { ok: false, status: 502 } as Response,
    });
    const result = await grantConsent(ME, "dating");
    expect(result).toBeNull();
    expect(ensureAffinity).not.toHaveBeenCalled();
  });

  it("skips the affinity creation when the consent_type doesn't match any configured layer", async () => {
    GET.mockResolvedValueOnce(USER_RESPONSE).mockResolvedValueOnce(
      listResponse([{ id: "layer-id-X", key: "other" }]),
    );
    POST.mockResolvedValueOnce(
      envelopeResponse({ id: "c1", consent_type: "ghost", granted_at: "2026-04-26T00:00:00Z" }),
    );
    await grantConsent(ME, "ghost");
    expect(ensureAffinity).not.toHaveBeenCalled();
  });
});

describe("revokeConsent", () => {
  it("DELETEs the right path and returns true on 204", async () => {
    GET.mockResolvedValueOnce(USER_RESPONSE);
    DELETE.mockResolvedValueOnce({
      data: undefined,
      response: { ok: true, status: 204 } as Response,
    });
    expect(await revokeConsent(ME, "c1")).toBe(true);
    expect(DELETE).toHaveBeenCalledWith(
      "/api/v1/clients/{client_id}/users/{user_id}/consents/{id}",
      {
        params: {
          path: { client_id: "tenant-x", user_id: "internal-alice", id: "c1" },
        },
      },
    );
  });
});
