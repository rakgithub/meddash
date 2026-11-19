import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProduct } from "./fetchProduct";
import { ibuprofenDetail } from "../../../test/fixtures";

afterEach(() => vi.unstubAllGlobals());

describe("fetchProduct", () => {
  it("calls /api/products/:id and returns the product", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ibuprofenDetail });
    vi.stubGlobal("fetch", fetchMock);
    const { signal } = new AbortController();

    await expect(fetchProduct("1", signal)).resolves.toEqual(ibuprofenDetail);
    expect(fetchMock).toHaveBeenCalledWith("/api/products/1", { signal });
  });

  it("encodes the id so it cannot change the path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ibuprofenDetail });
    vi.stubGlobal("fetch", fetchMock);

    await fetchProduct("1/../2?x=y");

    expect(fetchMock.mock.calls[0]![0]).toBe("/api/products/1%2F..%2F2%3Fx%3Dy");
  });

  it("rejects with the status when the server responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" }),
    );

    await expect(fetchProduct("99")).rejects.toMatchObject({ status: 404 });
  });
});
