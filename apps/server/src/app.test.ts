import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

const app = createApp();

describe("createApp /api prefix", () => {
  it.each(["/openapi.json", "/api/openapi.json"])("serves %s", async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("paths");
  });

  it("only strips a whole /api segment", async () => {
    const res = await request(app).get("/apiary");
    expect(res.status).toBe(404);
  });

  it("falls back to 404 for an unknown path under /api", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
  });
});
