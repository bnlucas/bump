import { describe, expect, it, vi, beforeEach } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const DELETE = vi.fn();

vi.mock("./simbee", () => ({
  simbee: () => ({ fetch: { GET, POST, PUT, DELETE } }),
}));

const { simbeeRaw } = vi.hoisted(() => ({ simbeeRaw: vi.fn() }));
vi.mock("./simbee-raw", () => ({ simbeeRaw }));

import {
  addAffinityTag,
  listAttachedTagIds,
  removeAffinityTag,
} from "./affinity-tags";

beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
  DELETE.mockReset();
  simbeeRaw.mockReset();
});

const USER_RESPONSE = {
  data: {
    data: {
      id: "internal-alice",
      client_id: "tenant-x",
      external_id: "alice",
    },
  },
  response: { ok: true } as Response,
};

describe("addAffinityTag", () => {
  it("posts {tag_id, tag_type} to /users/{ext}/affinity/tags", async () => {
    POST.mockResolvedValueOnce({
      data: { data: { id: "at-1", affinity_id: "aff", tag_id: "t-1", tag_type: "client" } },
      response: { ok: true } as Response,
    });
    const result = await addAffinityTag("alice", "t-1");
    expect(POST).toHaveBeenCalledWith(
      "/api/v1/users/{external_id}/affinity/tags",
      {
        params: { path: { external_id: "alice" } },
        body: { tag_id: "t-1", tag_type: "client" },
      },
    );
    expect(result?.id).toBe("at-1");
  });

  it("respects an explicit tag_type", async () => {
    POST.mockResolvedValueOnce({
      data: { data: { id: "at-1" } },
      response: { ok: true } as Response,
    });
    await addAffinityTag("alice", "t-1", "system");
    expect(POST).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ body: { tag_id: "t-1", tag_type: "system" } }),
    );
  });

  it("returns null when the response carries no data", async () => {
    POST.mockResolvedValueOnce({
      data: undefined,
      response: { ok: false, status: 502 } as Response,
    });
    expect(await addAffinityTag("alice", "t-1")).toBeNull();
  });
});

describe("removeAffinityTag", () => {
  it("DELETEs at /users/{ext}/affinity/tags/{id}", async () => {
    DELETE.mockResolvedValueOnce({
      data: undefined,
      response: { ok: true, status: 204 } as Response,
    });
    expect(await removeAffinityTag("alice", "at-1")).toBe(true);
    expect(DELETE).toHaveBeenCalledWith(
      "/api/v1/users/{external_id}/affinity/tags/{id}",
      { params: { path: { external_id: "alice", id: "at-1" } } },
    );
  });
});

describe("listAttachedTagIds", () => {
  it("calls the internal /affinity_tags route via simbeeRaw with the resolved ids", async () => {
    GET.mockResolvedValueOnce(USER_RESPONSE);
    simbeeRaw.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        data: [
          { id: "tag-1", tag_type: "client" },
          { id: "tag-2", tag_type: "client" },
        ],
      },
    });
    const result = await listAttachedTagIds("alice");
    expect(simbeeRaw).toHaveBeenCalledWith(
      "/internal/v1/clients/tenant-x/users/alice/affinity_tags",
    );
    expect(result).toEqual(["tag-1", "tag-2"]);
  });

  it("appends the consent_layer_id query when provided", async () => {
    GET.mockResolvedValueOnce(USER_RESPONSE);
    simbeeRaw.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { data: [] },
    });
    await listAttachedTagIds("alice", "layer-A");
    expect(simbeeRaw).toHaveBeenCalledWith(
      "/internal/v1/clients/tenant-x/users/alice/affinity_tags?consent_layer_id=layer-A",
    );
  });

  it("returns [] when the user lookup fails", async () => {
    GET.mockResolvedValueOnce({
      data: undefined,
      response: { ok: false, status: 404 } as Response,
    });
    expect(await listAttachedTagIds("alice")).toEqual([]);
    expect(simbeeRaw).not.toHaveBeenCalled();
  });
});
