import { describe, expect, it, vi, beforeEach } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const DELETE = vi.fn();

vi.mock("./simbee", () => ({
  simbee: () => ({ fetch: { GET, POST, PUT, DELETE } }),
}));

import { createAffinity, ensureAffinity, listAffinities } from "./affinities";

beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
});

function listResponse(items: Array<Record<string, unknown>>) {
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

describe("listAffinities", () => {
  it("hits /users/{ext}/affinity with the right params", async () => {
    GET.mockResolvedValueOnce(listResponse([]));
    await listAffinities("alice");
    expect(GET).toHaveBeenCalledWith("/api/v1/users/{external_id}/affinity", {
      params: { path: { external_id: "alice" } },
    });
  });

  it("returns [] when the response has no data", async () => {
    GET.mockResolvedValueOnce({
      data: undefined,
      response: { ok: false, status: 500 } as Response,
    });
    expect(await listAffinities("alice")).toEqual([]);
  });
});

describe("createAffinity", () => {
  it("posts the consent_layer_id in the body", async () => {
    POST.mockResolvedValueOnce(envelopeResponse({ id: "aff-1" }));
    const result = await createAffinity("alice", "layer-A");
    expect(POST).toHaveBeenCalledWith("/api/v1/users/{external_id}/affinity", {
      params: { path: { external_id: "alice" } },
      body: { consent_layer_id: "layer-A" },
    });
    expect(result).toEqual({ id: "aff-1" });
  });

  it("returns null when the response carries no data", async () => {
    POST.mockResolvedValueOnce({
      data: undefined,
      response: { ok: false, status: 502 } as Response,
    });
    expect(await createAffinity("alice", "layer-A")).toBeNull();
  });
});

describe("ensureAffinity", () => {
  it("reuses an existing affinity for the requested layer (no POST)", async () => {
    GET.mockResolvedValueOnce(
      listResponse([{ id: "aff-existing", consent_layer_id: "layer-A" }]),
    );
    const result = await ensureAffinity("alice", "layer-A");
    expect(result).toEqual({ id: "aff-existing", consent_layer_id: "layer-A" });
    expect(POST).not.toHaveBeenCalled();
  });

  it("creates a new affinity when none exist for that layer", async () => {
    GET.mockResolvedValueOnce(
      listResponse([{ id: "aff-other", consent_layer_id: "layer-B" }]),
    );
    POST.mockResolvedValueOnce(envelopeResponse({ id: "aff-new" }));
    const result = await ensureAffinity("alice", "layer-A");
    expect(result).toEqual({ id: "aff-new" });
    expect(POST).toHaveBeenCalledTimes(1);
  });

  it("creates when the user has no affinities at all", async () => {
    GET.mockResolvedValueOnce(listResponse([]));
    POST.mockResolvedValueOnce(envelopeResponse({ id: "aff-new" }));
    await ensureAffinity("alice", "layer-A");
    expect(POST).toHaveBeenCalledWith(
      "/api/v1/users/{external_id}/affinity",
      expect.objectContaining({ body: { consent_layer_id: "layer-A" } }),
    );
  });
});
