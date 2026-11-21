import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../createApp.js";
import { STREAM_ERROR_MESSAGE } from "../controllers/assistant.controller.js";
import { PLACEHOLDER_REPLY } from "../services/assistant/runTurn.js";
import type * as RunTurnModule from "../services/assistant/runTurn.js";

// Tests never have a real key; switch the client on and off per test.
const client = vi.hoisted(() => {
  const state: { current: object | null } = { current: null };
  return state;
});
vi.mock("../services/assistant/anthropicClient.js", () => ({
  get anthropicClient() {
    return client.current;
  },
}));

// Lets a test make the turn fail after its first part, once the stream is open.
const failing = vi.hoisted(() => ({ on: false }));
vi.mock("../services/assistant/runTurn.js", async (importOriginal) => {
  const original = await importOriginal<typeof RunTurnModule>();
  return {
    ...original,
    async *runTurn(...args: Parameters<typeof original.runTurn>) {
      if (!failing.on) return yield* original.runTurn(...args);
      yield { kind: "text" as const, text: "Partial" };
      throw new Error("model exploded");
    },
  };
});

const app = createApp();
const path = "/assistant/messages";

const body = (userText = "Sore throat and a temperature") => ({
  caseFile: { symptoms: [], duration: null, forWhom: null, avoid: [] },
  history: [],
  userText,
});

async function signedIn() {
  const agent = request.agent(app);
  await agent
    .post("/auth/register")
    .send({
      email: `assistant-${randomUUID()}@example.com`,
      password: "correct horse",
      name: "Ana",
    })
    .expect(201);
  return agent;
}

/** Splits an SSE body into its events. */
function events(text: string) {
  return text
    .split("\n\n")
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      const name = lines.find((l) => l.startsWith("event: "))?.slice(7) ?? "message";
      const data = lines.find((l) => l.startsWith("data: "))?.slice(6) ?? "";
      return { name, data: JSON.parse(data) as unknown };
    });
}

beforeEach(() => {
  client.current = {};
  failing.on = false;
});

describe("POST /assistant/messages", () => {
  it("streams the parts as SSE and ends with a done event", async () => {
    const agent = await signedIn();
    const res = await agent.post(path).send(body());

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^text\/event-stream/);
    expect(res.headers["cache-control"]).toBe("no-cache");
    expect(events(res.text)).toEqual([
      {
        name: "message",
        data: { kind: "thinking", steps: [{ label: "Checking for warning signs", done: true }] },
      },
      { name: "message", data: { kind: "text", text: PLACEHOLDER_REPLY } },
      { name: "done", data: {} },
    ]);
  });

  it("turns a failure after the stream opened into one error event", async () => {
    failing.on = true;
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const agent = await signedIn();
    const res = await agent.post(path).send(body());

    expect(res.status).toBe(200);
    expect(events(res.text)).toEqual([
      { name: "message", data: { kind: "text", text: "Partial" } },
      { name: "error", data: { message: STREAM_ERROR_MESSAGE } },
    ]);
    expect(logged).toHaveBeenCalledOnce();
    logged.mockRestore();
  });

  it("answers an urgent red flag with the alert and nothing else", async () => {
    const agent = await signedIn();
    const res = await agent.post(path).send(body("I have chest pain"));

    expect(events(res.text)).toEqual([
      {
        name: "message",
        data: expect.objectContaining({ kind: "alert", level: "urgent" }),
      },
      { name: "done", data: {} },
    ]);
  });

  it("also works under the /api prefix", async () => {
    const agent = await signedIn();
    expect((await agent.post(`/api${path}`).send(body())).status).toBe(200);
  });

  it("returns 401 when signed out", async () => {
    const res = await request(app).post(path).send(body());
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Not authenticated");
  });

  it("returns 503 when no API key is configured", async () => {
    client.current = null;
    const agent = await signedIn();
    const res = await agent.post(path).send(body());
    expect(res.status).toBe(503);
    expect(res.body.error.message).toBe("Assistant is not configured");
  });

  it.each([
    ["userText", { userText: "" }],
    ["userText", { userText: "a".repeat(1001) }],
    ["history", { history: Array(21).fill({ role: "user", text: "hi" }) }],
    ["history.0.role", { history: [{ role: "system", text: "hi" }] }],
    ["caseFile.forWhom", { caseFile: { ...body().caseFile, forWhom: "dog" } }],
    ["caseFile", { caseFile: undefined }],
  ])("returns 400 for an invalid %s", async (field, change) => {
    const agent = await signedIn();
    const res = await agent.post(path).send({ ...body(), ...change });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Invalid request body");
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field })]),
    );
  });

  it("returns 400 for an unknown field, such as a client-chosen model", async () => {
    const agent = await signedIn();
    const res = await agent.post(path).send({ ...body(), model: "claude-opus-5-5" });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].message).toMatch(/Unrecognized key.*model/);
  });

  it("returns 413 for a body over the JSON limit", async () => {
    const agent = await signedIn();
    const res = await agent.post(path).send({ ...body(), userText: "a".repeat(250_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.message).toBe("Request body too large");
  });

  it("does not count invalid requests toward the rate limit", async () => {
    const agent = await signedIn();
    for (let i = 0; i < 20; i++) {
      expect((await agent.post(path).send(body(""))).status).toBe(400);
    }
    expect((await agent.post(path).send(body())).status).toBe(200);
  });

  it("returns 429 with Retry-After after 20 turns in 10 minutes", async () => {
    const agent = await signedIn();
    for (let i = 0; i < 20; i++) {
      expect((await agent.post(path).send(body())).status).toBe(200);
    }
    const res = await agent.post(path).send(body());
    expect(res.status).toBe(429);
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
  });
});
