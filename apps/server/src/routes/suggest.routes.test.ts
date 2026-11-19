import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();

describe("GET /search/suggest", () => {
  it("returns products whose name starts with q, name matches first", async () => {
    const res = await request(app).get("/search/suggest?q=ibu");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [
        { id: "1", name: "Ibuprofen 400mg", brand: "Nurofen" },
        { id: "11", name: "Ibuprofen Gel", brand: "Nurofen" },
      ],
    });
  });

  it("matches the start of the brand, case-insensitively", async () => {
    const res = await request(app).get("/search/suggest?q=EUC");
    expect(res.body.items.map((s: { id: string }) => s.id)).toEqual(["9", "10"]);
  });

  it("returns an empty list when nothing matches", async () => {
    const res = await request(app).get("/search/suggest?q=zzz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [] });
  });

  it.each([
    ["", "q"],
    ["q=", "q"],
    ["q=%20%20", "q"],
    [`q=${"x".repeat(101)}`, "q"],
    ["q=a&q=b", "q"],
  ])("rejects invalid query %j", async (qs, field) => {
    const res = await request(app).get(`/search/suggest?${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe(field);
  });

  it("rejects unknown query params", async () => {
    const res = await request(app).get("/search/suggest?q=ibu&limit=10");
    expect(res.status).toBe(400);
  });
});
