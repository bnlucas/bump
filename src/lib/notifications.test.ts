import { describe, expect, it, vi } from "vitest";

const deliver = vi.fn();

vi.mock("./shroudb", () => ({
  shroudb: () => ({ courier: { deliver } }),
}));

import { notifyUser } from "./notifications";

describe("notifyUser", () => {
  it("forwards subject + body to courier.deliver on the configured channel", async () => {
    deliver.mockResolvedValueOnce({});
    await notifyUser({ recipient: "u1", subject: "hi", body: "hey" });
    expect(deliver).toHaveBeenCalledWith({
      channel: "default",
      recipient: "u1",
      SUBJECT: "hi",
      BODY: "hey",
      CONTENT_TYPE: "text/plain",
    });
  });

  it("swallows courier errors so callers never block", async () => {
    deliver.mockRejectedValueOnce(new Error("boom"));
    await expect(
      notifyUser({ recipient: "u1", subject: "hi", body: "hey" }),
    ).resolves.toBeUndefined();
  });

  it("respects an explicit contentType", async () => {
    deliver.mockResolvedValueOnce({});
    await notifyUser({
      recipient: "u1",
      subject: "hi",
      body: '{"k":"v"}',
      contentType: "application/json",
    });
    expect(deliver).toHaveBeenLastCalledWith(
      expect.objectContaining({ CONTENT_TYPE: "application/json" }),
    );
  });
});
