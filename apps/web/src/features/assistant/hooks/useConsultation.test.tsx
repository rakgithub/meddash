import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as engineModule from "../api/mockEngine";
import type { MessagePart } from "../types";
import { useConsultation } from "./useConsultation";

vi.mock("../api/mockEngine");
const engine = vi.mocked(engineModule.mockEngine);

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
});
