import { afterEach, describe, expect, it, vi } from "vitest";
import { ibuprofenDetail } from "../../../test/fixtures";
import type { CaseFile, Message, MessagePart } from "../types";
import { emptyCaseFile } from "../utils/caseFile";
import {
  AssistantError,
  condenseHistory,
  isMessagePart,
  parseSseEvents,
  RATE_LIMIT_MESSAGE,
  streamEngine,
} from "./streamEngine";

afterEach(() => vi.unstubAllGlobals());

const encoder = new TextEncoder();

/** A streamed response that delivers `chunks` exactly as split, like the network would. */
function sseResponse(chunks: string[]) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/event-stream" } });
}

const data = (part: unknown) => `data: ${JSON.stringify(part)}\n\n`;
const DONE = "event: done\ndata: {}\n\n";

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function collect({
  userText = "Sore throat",
  caseFile = emptyCaseFile,
  history = [],
  signal = new AbortController().signal,
}: { userText?: string; caseFile?: CaseFile; history?: Message[]; signal?: AbortSignal } = {}) {
  const parts: MessagePart[] = [];
  for await (const part of streamEngine({ caseFile, history, userText, signal })) parts.push(part);
  return parts;
}

describe("parseSseEvents", () => {
  it("splits complete events and keeps the unfinished rest", () => {
    expect(parseSseEvents('data: {"a":1}\n\nevent: done\ndata: {}\n\ndata: {"b"')).toEqual({
      events: [
        { event: "message", data: '{"a":1}' },
        { event: "done", data: "{}" },
      ],
      rest: 'data: {"b"',
    });
  });

  it("accepts CRLF line endings and joins multi-line data", () => {
    expect(parseSseEvents("data: one\r\ndata: two\r\n\r\n").events).toEqual([
      { event: "message", data: "one\ntwo" },
    ]);
  });
});

describe("isMessagePart", () => {
  it.each<MessagePart>([
    { kind: "text", text: "Hi" },
    { kind: "thinking", steps: [] },
    { kind: "symptoms", symptoms: ["Cough"] },
    { kind: "quickReplies", question: "How long?", field: "duration", options: [] },
    { kind: "products", items: [] },
    { kind: "alert", level: "caution", title: "Careful", body: "See a doctor" },
  ])("accepts a $kind part", (part) => {
    expect(isMessagePart(part)).toBe(true);
  });

  it.each([null, "text", { kind: "video" }, { kind: "text" }, { kind: "alert", level: "x" }])(
    "rejects %j",
    (value) => {
      expect(isMessagePart(value)).toBe(false);
    },
  );
});

describe("condenseHistory", () => {
  it("keeps the role, the text and the ids of the last products shown", () => {
    const history: Message[] = [
      { id: "u", role: "user", status: "done", parts: [{ kind: "text", text: "Cough" }] },
      {
        id: "a",
        role: "assistant",
        status: "done",
        parts: [
          { kind: "text", text: "Try " },
          { kind: "text", text: "this." },
          { kind: "products", items: [], loading: 1 },
          { kind: "products", items: [{ product: ibuprofenDetail, reason: "r", fit: "best" }] },
          { kind: "quickReplies", question: "Who?", field: "forWhom", options: [] },
        ],
      },
      { id: "b", role: "assistant", status: "error", parts: [] },
    ];

    expect(condenseHistory(history)).toEqual([
      { role: "user", text: "Cough" },
      { role: "assistant", text: "Try this.", productIds: ["1"] },
      { role: "assistant", text: "", productIds: [] },
    ]);
  });

  it("sends only the last 20 messages, which is what the server accepts", () => {
    const history = Array.from({ length: 25 }, (_, i): Message => ({
      id: String(i),
      role: "user",
      status: "done",
      parts: [{ kind: "text", text: `m${i}` }],
    }));

    const condensed = condenseHistory(history);
    expect(condensed).toHaveLength(20);
    expect(condensed[0]).toEqual({ role: "user", text: "m5" });
  });
});

describe("streamEngine", () => {
  it("posts the turn and yields the parts, however the chunks are split", async () => {
    const fetchMock = stubFetch(
      sseResponse([
        // Two events in one chunk, then one event split across three chunks.
        data({ kind: "text", text: "Hello " }) + data({ kind: "text", text: "there" }),
        'data: {"kind":"sympt',
        'oms","symptoms":["Cough"]}\n',
        "\n" + DONE,
      ]),
    );
    const caseFile = { ...emptyCaseFile, symptoms: ["Cough"] };

    await expect(collect({ caseFile, userText: "Cough" })).resolves.toEqual([
      { kind: "text", text: "Hello " },
      { kind: "text", text: "there" },
      { kind: "symptoms", symptoms: ["Cough"] },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assistant/messages",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      caseFile,
      history: [],
      userText: "Cough",
    });
  });

  it("drops events of a kind it doesn't know", async () => {
    stubFetch(
      sseResponse([data({ kind: "video", url: "x" }), data({ kind: "text", text: "Ok" }), DONE]),
    );

    await expect(collect()).resolves.toEqual([{ kind: "text", text: "Ok" }]);
  });

  it("throws the server's message on an error event", async () => {
    stubFetch(
      sseResponse([
        data({ kind: "text", text: "Part" }),
        'event: error\ndata: {"message":"The assistant could not answer."}\n\n',
      ]),
    );

    await expect(collect()).rejects.toEqual(new AssistantError("The assistant could not answer."));
  });

  it("throws when the stream ends without done", async () => {
    stubFetch(sseResponse([data({ kind: "text", text: "Part" })]));

    await expect(collect()).rejects.toThrow("The reply was cut off");
  });

  it("asks to try again later when rate limited", async () => {
    stubFetch(Response.json({ error: { message: "Too many requests" } }, { status: 429 }));

    await expect(collect()).rejects.toEqual(new AssistantError(RATE_LIMIT_MESSAGE));
  });

  it("throws the server's message for another non-2xx response", async () => {
    stubFetch(
      Response.json({ error: { message: "Assistant is not configured" } }, { status: 503 }),
    );

    await expect(collect()).rejects.toThrow("Assistant is not configured");
  });

  it("shows an urgent alert without calling the server", async () => {
    const fetchMock = stubFetch(sseResponse([DONE]));

    const parts = await collect({ userText: "I have chest pain" });

    expect(parts).toEqual([expect.objectContaining({ kind: "alert", level: "urgent" })]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("offers an area's common symptoms without calling the server", async () => {
    const fetchMock = stubFetch(sseResponse([DONE]));

    const parts = await collect({ userText: "My nose and throat" });

    expect(parts.at(-1)).toEqual({
      kind: "quickReplies",
      question: "What’s going on with your nose and throat?",
      field: "symptoms",
      options: ["Sore throat", "Blocked nose", "Sneezing", "Cough"].map((s) => ({
        label: s,
        value: s,
      })),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects when aborted mid-stream", async () => {
    const controller = new AbortController();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(encoder.encode(data({ kind: "text", text: "Part" })));
      },
    });
    stubFetch(new Response(body));
    const parts: MessagePart[] = [];

    await expect(
      (async () => {
        for await (const part of streamEngine({
          caseFile: emptyCaseFile,
          history: [],
          userText: "Cough",
          signal: controller.signal,
        })) {
          parts.push(part);
          controller.abort();
        }
      })(),
    ).rejects.toThrow();
    expect(parts).toEqual([{ kind: "text", text: "Part" }]);
  });
});
