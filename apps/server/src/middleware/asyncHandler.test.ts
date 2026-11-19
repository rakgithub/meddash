import { describe, expect, it, vi } from "vitest";
import { asyncHandler } from "./asyncHandler.js";

describe("asyncHandler", () => {
  it("forwards a rejected promise to next", async () => {
    const err = new Error("db down");
    const next = vi.fn();
    asyncHandler(async () => {
      throw err;
    })({}, {}, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(err));
  });

  it("does not call next when the handler resolves", async () => {
    const next = vi.fn();
    const handler = vi.fn(async () => {});
    asyncHandler(handler)({}, {}, next);
    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
    await Promise.resolve();
    expect(next).not.toHaveBeenCalled();
  });
});
