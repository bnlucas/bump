import { describe, expect, it, vi, beforeEach } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const DELETE = vi.fn();

vi.mock("./simbee", () => ({
  simbee: () => ({ fetch: { GET, POST, PUT, DELETE } }),
}));

import { addAffinityTopic, removeAffinityTopic } from "./affinity-topics";

beforeEach(() => {
  POST.mockReset();
  DELETE.mockReset();
});

describe("addAffinityTopic", () => {
  it("forwards the full CreateAffinityTopic body", async () => {
    POST.mockResolvedValueOnce({
      data: { data: { id: "topic-row-1" } },
      response: { ok: true } as Response,
    });
    const body = {
      topic_id: "topic-1",
      topic_type: "client",
      preference_id: "pref-1",
      role_id: "role-1",
      important: true,
      must_have: false,
    };
    const result = await addAffinityTopic("alice", body);
    expect(POST).toHaveBeenCalledWith(
      "/api/v1/users/{external_id}/affinity/topics",
      { params: { path: { external_id: "alice" } }, body },
    );
    expect(result?.id).toBe("topic-row-1");
  });

  it("returns null when no row comes back", async () => {
    POST.mockResolvedValueOnce({
      data: undefined,
      response: { ok: false, status: 422 } as Response,
    });
    const result = await addAffinityTopic("alice", {
      topic_id: "t",
      topic_type: "client",
      preference_id: "p",
    });
    expect(result).toBeNull();
  });
});

describe("removeAffinityTopic", () => {
  it("DELETEs at /users/{ext}/affinity/topics/{id} and returns true on success", async () => {
    DELETE.mockResolvedValueOnce({
      data: undefined,
      response: { ok: true, status: 204 } as Response,
    });
    expect(await removeAffinityTopic("alice", "topic-row-1")).toBe(true);
    expect(DELETE).toHaveBeenCalledWith(
      "/api/v1/users/{external_id}/affinity/topics/{id}",
      { params: { path: { external_id: "alice", id: "topic-row-1" } } },
    );
  });

  it("returns false on a non-OK response", async () => {
    DELETE.mockResolvedValueOnce({
      data: undefined,
      response: { ok: false, status: 404 } as Response,
    });
    expect(await removeAffinityTopic("alice", "missing")).toBe(false);
  });
});
