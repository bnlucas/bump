import { describe, expect, it, vi, beforeEach } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const DELETE = vi.fn();

vi.mock("./simbee", () => ({
  simbee: () => ({ fetch: { GET, POST, PUT, DELETE } }),
}));

const shroudbPut = vi.fn();
const shroudbDelete = vi.fn();
const shroudbGet = vi.fn();
const shroudbList = vi.fn();
const namespaceCreate = vi.fn();
const stashStore = vi.fn();
const stashRevoke = vi.fn();
const stashRetrieve = vi.fn();
const courierDeliver = vi.fn();

vi.mock("./shroudb", () => ({
  shroudb: () => ({
    shroudb: {
      put: shroudbPut,
      delete: shroudbDelete,
      get: shroudbGet,
      list: shroudbList,
      namespaceCreate,
    },
    stash: { store: stashStore, revoke: stashRevoke, retrieve: stashRetrieve },
    courier: { deliver: courierDeliver },
  }),
}));

const userGet = vi.fn();
vi.mock("./sigil", () => ({
  SIGIL_USER_SCHEMA: "users",
  sigil: () => ({ userGet }),
}));

const { resolveInternalUserId } = vi.hoisted(() => ({
  resolveInternalUserId: vi.fn(),
}));
vi.mock("./simbee-user", () => ({ resolveInternalUserId }));

import { createPost } from "./posts";

beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
  shroudbPut.mockReset();
  shroudbDelete.mockReset();
  shroudbGet.mockReset();
  namespaceCreate.mockReset();
  userGet.mockReset();
  resolveInternalUserId.mockReset();
});

describe("createPost", () => {
  it("rolls back the ShrouDB body when Simbee Content registration fails", async () => {
    namespaceCreate.mockResolvedValueOnce({});
    shroudbPut.mockResolvedValueOnce({});
    POST.mockResolvedValueOnce({
      data: undefined,
      response: { ok: false, status: 502 } as Response,
    });
    shroudbDelete.mockResolvedValueOnce({});

    const result = await createPost("alice", { title: "T", body: "B" });

    expect(shroudbPut).toHaveBeenCalledTimes(1);
    expect(POST).toHaveBeenCalledWith(
      "/api/v1/content",
      expect.objectContaining({
        body: expect.objectContaining({
          author_external_id: "alice",
          content_type: "post",
        }),
      }),
    );
    expect(shroudbDelete).toHaveBeenCalledWith("posts", expect.any(String));
    expect(result).toBeNull();
  });

  it("does not roll back when registration succeeds", async () => {
    namespaceCreate.mockResolvedValueOnce({});
    shroudbPut.mockResolvedValueOnce({});
    POST.mockResolvedValueOnce({
      data: {
        data: {
          id: "content-1",
          client_id: "t",
          external_id: "ext-1",
          author_id: "internal-alice",
          content_type: "post",
          visibility: "public",
          engagements_count: 0,
        },
      },
      response: { ok: true, status: 201 } as Response,
    });
    // hydrate path: readBody (ShrouDB get), sigil userGet, viewerInternalId=null
    shroudbGet.mockResolvedValueOnce({ value: JSON.stringify({ title: "T", body: "B" }) });
    userGet.mockResolvedValueOnce(null);

    const result = await createPost("alice", { title: "T", body: "B" });

    expect(shroudbDelete).not.toHaveBeenCalled();
    expect(result?.title).toBe("T");
    expect(result?.body).toBe("B");
  });

  it("threads the layer + topic into the ShrouDB body when present", async () => {
    namespaceCreate.mockResolvedValueOnce({});
    shroudbPut.mockResolvedValueOnce({});
    POST.mockResolvedValueOnce({
      data: undefined,
      response: { ok: false, status: 502 } as Response,
    });
    shroudbDelete.mockResolvedValueOnce({});

    await createPost("alice", {
      title: "T",
      body: "B",
      layer_key: "dating",
      topic_id: "topic-1",
      topic_name: "climbing",
    });

    const stored = JSON.parse(shroudbPut.mock.calls[0][2] as string);
    expect(stored).toEqual({
      title: "T",
      body: "B",
      layer_key: "dating",
      topic_id: "topic-1",
      topic_name: "climbing",
    });
  });
});
