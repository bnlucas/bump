import { describe, expect, it, vi, beforeEach } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const DELETE = vi.fn();

vi.mock("./simbee", () => ({
  simbee: () => ({ fetch: { GET, POST, PUT, DELETE } }),
}));

const stashStore = vi.fn();
const stashRevoke = vi.fn();
const stashRetrieve = vi.fn();

vi.mock("./shroudb", () => ({
  shroudb: () => ({
    shroudb: {},
    stash: { store: stashStore, revoke: stashRevoke, retrieve: stashRetrieve },
    courier: {},
  }),
}));

import { addPhoto, listPhotoIds, removePhoto, retrievePhoto } from "./photos";

beforeEach(() => {
  GET.mockReset();
  PUT.mockReset();
  stashStore.mockReset();
  stashRevoke.mockReset();
  stashRetrieve.mockReset();
});

const userResponse = (traits: Record<string, unknown>) => ({
  data: {
    data: {
      id: "internal-alice",
      client_id: "t",
      external_id: "alice",
      traits,
    },
  },
  response: { ok: true } as Response,
});

describe("listPhotoIds", () => {
  it("returns the traits.photo_ids array of strings", async () => {
    GET.mockResolvedValueOnce(userResponse({ photo_ids: ["a", "b"], bio: "hi" }));
    expect(await listPhotoIds("alice")).toEqual(["a", "b"]);
  });

  it("returns [] when no photo_ids trait is set", async () => {
    GET.mockResolvedValueOnce(userResponse({ bio: "hi" }));
    expect(await listPhotoIds("alice")).toEqual([]);
  });

  it("filters non-string entries silently", async () => {
    GET.mockResolvedValueOnce(userResponse({ photo_ids: ["a", 42, null, "b"] }));
    expect(await listPhotoIds("alice")).toEqual(["a", "b"]);
  });
});

describe("addPhoto", () => {
  it("stores in stash with the content_type, then PUTs the new traits with the appended id", async () => {
    GET.mockResolvedValueOnce(userResponse({ photo_ids: ["a"] }));
    stashStore.mockResolvedValueOnce({ status: "ok" });
    PUT.mockResolvedValueOnce({
      data: { data: {} },
      response: { ok: true } as Response,
    });

    const id = await addPhoto("alice", "BASE64", "image/jpeg");

    expect(stashStore).toHaveBeenCalledWith(id, "BASE64", {
      content_type: "image/jpeg",
    });
    expect(PUT).toHaveBeenCalledWith(
      "/api/v1/users/{external_id}",
      expect.objectContaining({
        params: { path: { external_id: "alice" } },
        body: expect.objectContaining({
          traits: expect.objectContaining({
            photo_ids: ["a", id],
          }),
        }),
      }),
    );
  });
});

describe("removePhoto", () => {
  it("revokes in stash and rewrites traits without the id", async () => {
    GET.mockResolvedValueOnce(userResponse({ photo_ids: ["a", "b", "c"] }));
    stashRevoke.mockResolvedValueOnce({ status: "ok" });
    PUT.mockResolvedValueOnce({
      data: { data: {} },
      response: { ok: true } as Response,
    });

    const ok = await removePhoto("alice", "b");

    expect(ok).toBe(true);
    expect(stashRevoke).toHaveBeenCalledWith("b");
    const putBody = PUT.mock.calls[0][1].body;
    expect(putBody.traits.photo_ids).toEqual(["a", "c"]);
  });

  it("returns false without touching stash when the id isn't in traits", async () => {
    GET.mockResolvedValueOnce(userResponse({ photo_ids: ["a"] }));
    expect(await removePhoto("alice", "ghost")).toBe(false);
    expect(stashRevoke).not.toHaveBeenCalled();
    expect(PUT).not.toHaveBeenCalled();
  });
});

describe("retrievePhoto", () => {
  it("decodes plaintext base64 and uses metadata.content_type", async () => {
    stashRetrieve.mockResolvedValueOnce([
      JSON.stringify({ content_type: "image/png" }),
      Buffer.from("hello").toString("base64"),
    ]);
    const result = await retrievePhoto("p-1");
    expect(result?.contentType).toBe("image/png");
    expect(result?.bytes.toString("utf8")).toBe("hello");
  });

  it("falls back to application/octet-stream when metadata lacks content_type", async () => {
    stashRetrieve.mockResolvedValueOnce([
      JSON.stringify({}),
      Buffer.from("x").toString("base64"),
    ]);
    const result = await retrievePhoto("p-1");
    expect(result?.contentType).toBe("application/octet-stream");
  });

  it("returns null when the response is not the expected tuple shape", async () => {
    stashRetrieve.mockResolvedValueOnce({ unexpected: "shape" });
    expect(await retrievePhoto("p-1")).toBeNull();
  });

  it("returns null on stash error", async () => {
    stashRetrieve.mockRejectedValueOnce(new Error("nope"));
    expect(await retrievePhoto("p-1")).toBeNull();
  });
});
