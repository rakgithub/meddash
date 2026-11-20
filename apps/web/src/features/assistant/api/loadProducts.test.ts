import { afterEach, describe, expect, it, vi } from "vitest";
import { coughSyrupDetail, ibuprofenDetail } from "../../../test/fixtures";
import { loadProducts } from "./loadProducts";

afterEach(() => vi.restoreAllMocks());

describe("loadProducts", () => {
  it("loads every product in order", async () => {
    const load = vi.fn((id: string) =>
      Promise.resolve(id === "1" ? ibuprofenDetail : coughSyrupDetail),
    );
    const { signal } = new AbortController();

    await expect(loadProducts(["7", "1"], signal, load)).resolves.toEqual({
      products: [coughSyrupDetail, ibuprofenDetail],
      unavailable: 0,
    });
    expect(load).toHaveBeenCalledWith("7", signal);
  });

  it("leaves out products that fail and counts them", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const load = vi.fn((id: string) =>
      id === "1" ? Promise.resolve(ibuprofenDetail) : Promise.reject(new Error("404")),
    );

    await expect(loadProducts(["1", "99"], new AbortController().signal, load)).resolves.toEqual({
      products: [ibuprofenDetail],
      unavailable: 1,
    });
  });

  it("rejects when aborted", async () => {
    const controller = new AbortController();
    const load = vi.fn(() => {
      controller.abort();
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    });

    await expect(loadProducts(["1"], controller.signal, load)).rejects.toThrow();
  });
});
