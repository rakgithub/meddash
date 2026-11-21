import { afterEach, describe, expect, it, vi } from "vitest";
import type { CompareEvent } from "../types";
import { askCompare, isCompareEvent } from "./askCompare";
import { AssistantError, RATE_LIMIT_MESSAGE } from "./streamEngine";

afterEach(() => vi.unstubAllGlobals());

const encoder = new TextEncoder();

function sseResponse(chunks: string[]) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/event-stream" } });
}

const data = (event: unknown) => `data: ${JSON.stringify(event)}\n\n`;
const DONE = "event: done\ndata: {}\n\n";

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function collect(question = "Which is cheapest?") {
  const events: CompareEvent[] = [];
  for await (const event of askCompare(["1", "2"], question, new AbortController().signal)) {
    events.push(event);
  }
  return events;
}

describe("isCompareEvent", () => {
  it.each([
    [{ kind: "text", text: "Hi" }, true],
    [{ kind: "row", row: "unitPrice" }, true],
    [{ kind: "alert", level: "urgent", title: "t", body: "b" }, true],
    [{ kind: "row", row: "colour" }, false],
    [{ kind: "row" }, false],
    [{ kind: "text" }, false],
    [{ kind: "products", items: [] }, false],
    [null, false],
    ["text", false],
  ])("%j → %s", (value, expected) => {
    expect(isCompareEvent(value)).toBe(expected);
  });
});

describe("askCompare", () => {
  it("posts the ids and question and yields the text and row", async () => {
    const fetchMock = stubFetch(
      sseResponse([
        data({ kind: "text", text: "Paracetamol" }),
        data({ kind: "text", text: " is cheapest." }) + data({ kind: "row", row: "unitPrice" }),
        DONE,
      ]),
    );

    expect(await collect()).toEqual([
      { kind: "text", text: "Paracetamol" },
      { kind: "text", text: " is cheapest." },
      { kind: "row", row: "unitPrice" },
    ]);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/assistant/compare");
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(String(init?.body))).toEqual({
      productIds: ["1", "2"],
      question: "Which is cheapest?",
    });
  });

  it("drops events it doesn't know", async () => {
    stubFetch(sseResponse([data({ kind: "row", row: "colour" }), data({ kind: "html" }), DONE]));
    expect(await collect()).toEqual([]);
  });

  it("throws the server's message on an error event", async () => {
    stubFetch(sseResponse([`event: error\ndata: ${JSON.stringify({ message: "Nope." })}\n\n`]));
    await expect(collect()).rejects.toEqual(new AssistantError("Nope."));
  });

  it("asks to try again later when rate limited", async () => {
    stubFetch(new Response(JSON.stringify({ error: { message: "Too many" } }), { status: 429 }));
    await expect(collect()).rejects.toEqual(new AssistantError(RATE_LIMIT_MESSAGE));
  });

  it("shows an urgent alert without calling the server", async () => {
    const fetchMock = stubFetch(sseResponse([DONE]));
    expect(await collect("Which is best for my chest pain?")).toEqual([
      expect.objectContaining({ kind: "alert", level: "urgent" }),
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
