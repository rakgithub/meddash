import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as engineModule from "../api/streamEngine";
import type { MessagePart } from "../types";
import { useConsultation } from "./useConsultation";

// Keeps the real AssistantError so the hook can recognise it; only the engine is faked.
vi.mock("../api/streamEngine", async (importOriginal) => ({
  ...(await importOriginal<typeof engineModule>()),
  streamEngine: vi.fn(),
}));
const engine = vi.mocked(engineModule.streamEngine);

beforeEach(() => vi.resetAllMocks());

function reply(...parts: MessagePart[]) {
  return async function* () {
    yield* parts;
  };
}

/** An engine that yields one part and then waits until it is aborted. */
function hangingEngine() {
  return async function* ({ signal }: { signal: AbortSignal }) {
    yield { kind: "text", text: "Partial " } satisfies MessagePart;
    await new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason)));
  };
}

const lastMessage = (result: { current: ReturnType<typeof useConsultation> }) =>
  result.current.messages[result.current.messages.length - 1];

describe("useConsultation", () => {
  it("streams the reply into the conversation and finishes it", async () => {
    engine.mockImplementation(
      reply({ kind: "text", text: "Drink " }, { kind: "text", text: "water." }),
    );
    const { result } = renderHook(() => useConsultation());

    act(() => result.current.send("  Headache  "));

    expect(result.current.isStreaming).toBe(true);
    expect(result.current.messages[0].parts).toEqual([{ kind: "text", text: "Headache" }]);
    await waitFor(() => expect(lastMessage(result).status).toBe("done"));
    expect(lastMessage(result).parts).toEqual([{ kind: "text", text: "Drink water." }]);
    expect(result.current.isStreaming).toBe(false);
    expect(engine).toHaveBeenCalledWith(
      expect.objectContaining({ userText: "Headache", history: [] }),
    );
  });

  it("passes the earlier conversation as history", async () => {
    engine.mockImplementation(reply({ kind: "text", text: "Ok." }));
    const { result } = renderHook(() => useConsultation());

    act(() => result.current.send("Cough"));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    act(() => result.current.send("Since Monday"));

    expect(engine).toHaveBeenLastCalledWith(
      expect.objectContaining({ userText: "Since Monday", history: expect.any(Array) }),
    );
    expect(engine.mock.lastCall?.[0].history).toHaveLength(2);
  });

  it("ignores blank text and sends nothing while a reply streams", () => {
    engine.mockImplementation(hangingEngine());
    const { result } = renderHook(() => useConsultation());

    act(() => result.current.send("   "));
    expect(result.current.messages).toHaveLength(0);

    act(() => result.current.send("Cough"));
    act(() => result.current.send("Again"));
    expect(result.current.messages).toHaveLength(2);
  });

  it("keeps the partial reply and marks it stopped on stop", async () => {
    engine.mockImplementation(hangingEngine());
    const { result } = renderHook(() => useConsultation());

    act(() => result.current.send("Cough"));
    await waitFor(() => expect(lastMessage(result).parts).toHaveLength(1));
    act(() => result.current.stop());

    await waitFor(() => expect(lastMessage(result).status).toBe("stopped"));
    expect(lastMessage(result).parts).toEqual([{ kind: "text", text: "Partial " }]);
    expect(engine.mock.lastCall?.[0].signal.aborted).toBe(true);
  });

  it("keeps the message of an AssistantError to show with the failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    engine.mockImplementationOnce(async function* () {
      yield* [];
      throw new engineModule.AssistantError("Please try again in a few minutes.");
    });
    const { result } = renderHook(() => useConsultation());

    act(() => result.current.send("Cough"));

    await waitFor(() => expect(lastMessage(result).status).toBe("error"));
    expect(lastMessage(result).error).toBe("Please try again in a few minutes.");
  });

  it("marks the reply as failed when the engine throws, and retries the same question", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    engine.mockImplementationOnce(async function* () {
      yield* [];
      throw new Error("boom");
    });
    const { result } = renderHook(() => useConsultation());

    act(() => result.current.send("Cough"));
    await waitFor(() => expect(lastMessage(result).status).toBe("error"));

    engine.mockImplementation(reply({ kind: "text", text: "Try honey." }));
    act(() => result.current.retry());

    await waitFor(() => expect(lastMessage(result).status).toBe("done"));
    expect(result.current.messages).toHaveLength(2);
    expect(lastMessage(result).parts).toEqual([{ kind: "text", text: "Try honey." }]);
    expect(engine).toHaveBeenLastCalledWith(
      expect.objectContaining({ userText: "Cough", history: [] }),
    );
  });

  it("shows the text at once when the user prefers reduced motion", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    engine.mockImplementation(
      reply(
        { kind: "thinking", steps: [{ label: "Checking", done: true }] },
        { kind: "text", text: "Drink " },
        { kind: "text", text: "water." },
      ),
    );
    const dispatchedTexts: string[] = [];
    const { result } = renderHook(() => {
      const consultation = useConsultation();
      const last = consultation.messages[consultation.messages.length - 1];
      const text = last?.parts.find((p) => p.kind === "text");
      if (text?.kind === "text") dispatchedTexts.push(text.text);
      return consultation;
    });

    act(() => result.current.send("Cough"));
    await waitFor(() => expect(lastMessage(result).status).toBe("done"));

    expect(dispatchedTexts.every((text) => text === "Drink water.")).toBe(true);
  });

  it("aborts a reply in progress on unmount", async () => {
    engine.mockImplementation(hangingEngine());
    const { result, unmount } = renderHook(() => useConsultation());

    act(() => result.current.send("Cough"));
    await waitFor(() => expect(lastMessage(result).parts).toHaveLength(1));
    unmount();

    expect(engine.mock.lastCall?.[0].signal.aborted).toBe(true);
  });

  it("echoes a quick-reply answer and passes the updated case file to the engine", async () => {
    engine.mockImplementation(reply({ kind: "text", text: "Ok." }));
    const { result } = renderHook(() => useConsultation());

    act(() => result.current.answer("forWhom", { label: "A child", value: "child" }));

    expect(result.current.messages[0].parts).toEqual([{ kind: "text", text: "A child" }]);
    expect(result.current.caseFile.forWhom).toBe("child");
    expect(engine.mock.lastCall?.[0]).toMatchObject({
      userText: "A child",
      caseFile: { forWhom: "child" },
    });
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
  });

  it("reports an ended session so the page can send the user to log in", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    engine.mockImplementationOnce(async function* () {
      yield* [];
      throw new engineModule.AssistantError("Your session has ended.", 401);
    });
    const onSessionEnded = vi.fn();
    const { result } = renderHook(() => useConsultation({ onSessionEnded }));

    act(() => result.current.send("Cough"));

    await waitFor(() => expect(onSessionEnded).toHaveBeenCalledOnce());
    expect(lastMessage(result).error).toBe("Your session has ended.");
  });

  it("starts over: cancels a reply in progress and clears the conversation", async () => {
    let aborted = false;
    engine.mockImplementation(async function* ({ signal }) {
      signal.addEventListener("abort", () => (aborted = true));
      yield* hangingEngine()({ signal });
    });
    const { result } = renderHook(() => useConsultation());
    act(() => result.current.send("Headache"));
    await waitFor(() => expect(lastMessage(result).parts).toHaveLength(1));

    act(() => result.current.startOver());

    expect(aborted).toBe(true);
    expect(result.current.messages).toEqual([]);
    expect(result.current.caseFile.symptoms).toEqual([]);
  });
});
