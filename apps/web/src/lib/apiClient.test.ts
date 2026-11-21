import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPostNoContent,
  apiPostStream,
} from "./apiClient";

function mockFetch(response: Partial<Response>) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("apiGet", () => {
  it("prefixes the path with /api and returns parsed JSON", async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ hello: "world" }) });

    const result = await apiGet<{ hello: string }>("/products");

    expect(fetchMock).toHaveBeenCalledWith("/api/products", undefined);
    expect(result).toEqual({ hello: "world" });
  });

  it("forwards request init such as the abort signal", async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({}) });
    const { signal } = new AbortController();

    await apiGet("/products", { signal });

    expect(fetchMock).toHaveBeenCalledWith("/api/products", { signal });
  });

  it("throws an ApiError carrying the status on a non-ok response", async () => {
    mockFetch({ ok: false, status: 500, statusText: "Internal Server Error" });

    const error = await apiGet("/products").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500, message: "Internal Server Error" });
  });

  it("uses the server's error message when the body has one", async () => {
    mockFetch({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ error: { message: "Product not found" } }),
    });

    const error = await apiGet("/products/9").catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 404, message: "Product not found" });
  });

  it("falls back to the status text for a body that is not JSON", async () => {
    mockFetch({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    });

    const error = await apiGet("/products").catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 502, message: "Bad Gateway" });
  });
});

describe("apiPost", () => {
  it("sends a JSON body and returns parsed JSON", async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ id: "1" }) });

    const result = await apiPost("/auth/login", { email: "a@b.de" });

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"email":"a@b.de"}',
    });
    expect(result).toEqual({ id: "1" });
  });

  it("throws an ApiError with the server message", async () => {
    mockFetch({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ error: { message: "Invalid email or password" } }),
    });

    const error = await apiPost("/auth/login", {}).catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 401, message: "Invalid email or password" });
  });
});

describe("apiPostNoContent", () => {
  it("posts without a body and resolves on success", async () => {
    const fetchMock = mockFetch({ ok: true, status: 204 });

    await expect(apiPostNoContent("/auth/logout")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });

  it("throws on failure", async () => {
    mockFetch({ ok: false, status: 500, statusText: "Internal Server Error" });

    await expect(apiPostNoContent("/auth/logout")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("apiPatch", () => {
  it("sends a JSON body with PATCH and returns parsed JSON", async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ itemCount: 3 }) });

    const result = await apiPatch("/cart/items/1", { quantity: 3 });

    expect(fetchMock).toHaveBeenCalledWith("/api/cart/items/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: '{"quantity":3}',
    });
    expect(result).toEqual({ itemCount: 3 });
  });

  it("throws an ApiError with the server message", async () => {
    mockFetch({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: async () => ({ error: { message: "Only 3 in stock" } }),
    });

    await expect(apiPatch("/cart/items/1", { quantity: 9 })).rejects.toMatchObject({
      status: 409,
      message: "Only 3 in stock",
    });
  });
});

describe("apiDelete", () => {
  it("sends DELETE and returns parsed JSON", async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ itemCount: 0 }) });

    await expect(apiDelete("/cart/items/1")).resolves.toEqual({ itemCount: 0 });
    expect(fetchMock).toHaveBeenCalledWith("/api/cart/items/1", { method: "DELETE" });
  });

  it("throws on failure", async () => {
    mockFetch({ ok: false, status: 404, statusText: "Not Found" });

    await expect(apiDelete("/cart/items/1")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("apiPostStream", () => {
  it("posts JSON asking for an event stream and returns the body", async () => {
    // A real response body, so the stream has the type fetch gives it.
    const { body } = new Response("data: {}\n\n");
    const fetchMock = mockFetch({ ok: true, status: 200, body });
    const signal = new AbortController().signal;

    expect(await apiPostStream("/assistant/compare", { q: 1 }, { signal })).toBe(body);
    expect(fetchMock).toHaveBeenCalledWith("/api/assistant/compare", {
      signal,
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: '{"q":1}',
    });
  });

  it("throws an ApiError with the server message", async () => {
    mockFetch({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      json: async () => ({ error: { message: "Too many" } }),
    });

    await expect(apiPostStream("/assistant/compare", {})).rejects.toEqual(
      new ApiError(429, "Too many"),
    );
  });

  it("throws when the response has no body", async () => {
    mockFetch({ ok: true, status: 200, body: null });

    await expect(apiPostStream("/assistant/compare", {})).rejects.toBeInstanceOf(ApiError);
  });
});
