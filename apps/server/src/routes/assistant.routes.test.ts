import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../createApp.js";
import { STREAM_ERROR_MESSAGE } from "../controllers/assistant.controller.js";
import type * as RunTurnModule from "../services/assistant/runTurn.js";
import type { TurnLog } from "../services/assistant/runTurn.js";
import { fakeModel } from "../test/fakeModel.js";

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
// Collects the usage lines instead of printing them.
const turnLogs = vi.hoisted((): TurnLog[] => []);
vi.mock("../services/assistant/runTurn.js", async (importOriginal) => {
  const original = await importOriginal<typeof RunTurnModule>();
  return {
    ...original,
    logTurnToStdout: (log: TurnLog) => turnLogs.push(log),
    logCompareToStdout: (log: TurnLog) => turnLogs.push(log),
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

/** A client whose every request gets the same short scripted answer. */
const fakeClient = {
  messages: {
    stream: (
      params: Parameters<ReturnType<typeof fakeModel>["stream"]>[0],
      options: { signal: AbortSignal },
    ) => fakeModel([{ text: ["Hello", " there."] }]).stream(params, options.signal),
  },
};

beforeEach(() => {
  client.current = fakeClient;
  failing.on = false;
  turnLogs.length = 0;
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
      { name: "message", data: { kind: "text", text: "Hello" } },
      { name: "message", data: { kind: "text", text: " there." } },
      { name: "done", data: {} },
    ]);
    // Wired to the configured model, and logged without any message text.
    expect(turnLogs).toEqual([
      expect.objectContaining({ model: "claude-haiku-5-5", stopReason: "end_turn" }),
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

describe("POST /assistant/compare", () => {
  const comparePath = "/assistant/compare";
  const compareBody = (question = "Which is gentler on the stomach?") => ({
    productIds: ["1", "2"],
    question,
  });

  it("streams the answer as SSE and ends with a done event", async () => {
    const agent = await signedIn();
    const res = await agent.post(comparePath).send(compareBody());

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^text\/event-stream/);
    expect(events(res.text)).toEqual([
      { name: "message", data: { kind: "text", text: "Hello" } },
      { name: "message", data: { kind: "text", text: " there." } },
      { name: "done", data: {} },
    ]);
    expect(turnLogs).toEqual([expect.objectContaining({ model: "claude-haiku-5-5" })]);
  });

  it("gives the model the products it loaded, by id", async () => {
    let sent = "";
    client.current = {
      messages: {
        stream: (
          params: Parameters<ReturnType<typeof fakeModel>["stream"]>[0],
          options: { signal: AbortSignal },
        ) => {
          sent = JSON.stringify(params.messages);
          return fakeModel([{ text: ["Ok."] }]).stream(params, options.signal);
        },
      },
    };
    const agent = await signedIn();
    await agent.post(comparePath).send(compareBody()).expect(200);

    expect(sent).toContain("Ibuprofen 400mg");
    expect(sent).toContain("Paracetamol 500mg");
  });

  it("answers an urgent red flag with the alert and nothing else", async () => {
    const agent = await signedIn();
    const res = await agent.post(comparePath).send(compareBody("Which one for my chest pain?"));

    expect(events(res.text)).toEqual([
      { name: "message", data: expect.objectContaining({ kind: "alert", level: "urgent" }) },
      { name: "done", data: {} },
    ]);
  });

  it("returns 404 for an unknown product before opening the stream", async () => {
    const agent = await signedIn();
    const res = await agent
      .post(comparePath)
      .send({ ...compareBody(), productIds: ["1", "999999"] });
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("Product not found");
  });

  it("does not count unknown products toward the rate limit", async () => {
    const agent = await signedIn();
    const unknown = { ...compareBody(), productIds: ["1", "999999"] };
    for (let i = 0; i < 20; i++) {
      expect((await agent.post(comparePath).send(unknown)).status).toBe(404);
    }
    expect((await agent.post(comparePath).send(compareBody())).status).toBe(200);
  });

  it("returns 401 when signed out", async () => {
    const res = await request(app).post(comparePath).send(compareBody());
    expect(res.status).toBe(401);
  });

  it("returns 503 when no API key is configured", async () => {
    client.current = null;
    const agent = await signedIn();
    const res = await agent.post(comparePath).send(compareBody());
    expect(res.status).toBe(503);
  });

  it.each([
    ["productIds", { productIds: ["1"] }],
    ["productIds", { productIds: ["1", "2", "3", "4", "5"] }],
    ["productIds", { productIds: ["1", "1"] }],
    ["productIds.1", { productIds: ["1", "abc"] }],
    ["question", { question: "" }],
    ["question", { question: "a".repeat(301) }],
  ])("returns 400 for an invalid %s", async (field, change) => {
    const agent = await signedIn();
    const res = await agent.post(comparePath).send({ ...compareBody(), ...change });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field })]),
    );
  });

  it("returns 400 for an unknown field", async () => {
    const agent = await signedIn();
    const res = await agent.post(comparePath).send({ ...compareBody(), model: "claude-opus-5-5" });
    expect(res.status).toBe(400);
  });

  it("counts toward the same rate limit as chat turns", async () => {
    const agent = await signedIn();
    for (let i = 0; i < 20; i++) {
      expect((await agent.post(path).send(body())).status).toBe(200);
    }
    const res = await agent.post(comparePath).send(compareBody());
    expect(res.status).toBe(429);
  });
});
