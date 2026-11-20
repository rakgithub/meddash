import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as engineModule from "../api/mockEngine";
import { ibuprofenDetail } from "../../../test/fixtures";
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

  it("sends a case file edit as a message and gives the engine the edited case file", async () => {
    engine.mockImplementation(reply({ kind: "symptoms", symptoms: ["Cough", "Fever"] }));
    const { result } = renderHook(() => useConsultation());
    act(() => result.current.send("Cough and fever"));
    await waitFor(() => expect(result.current.caseFile.symptoms).toEqual(["Cough", "Fever"]));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));

    act(() =>
      result.current.refine(
        { ...result.current.caseFile, symptoms: ["Cough"] },
        "Removed a symptom",
      ),
    );

    expect(result.current.caseFile.symptoms).toEqual(["Cough"]);
    expect(engine.mock.lastCall?.[0]).toMatchObject({
      userText: "Removed a symptom",
      caseFile: { symptoms: ["Cough"] },
    });
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
  });

  it("ignores a case file edit while a reply streams", () => {
    engine.mockImplementation(hangingEngine());
    const { result } = renderHook(() => useConsultation());
    act(() => result.current.send("Headache"));

    act(() => result.current.refine(result.current.caseFile, "Changed duration to Longer"));

    expect(engine).toHaveBeenCalledTimes(1);
    expect(result.current.messages).toHaveLength(2);
  });

  it("rules a product out and remembers why, without asking the engine again", async () => {
    engine.mockImplementation(
      reply({
        kind: "products",
        items: [{ product: ibuprofenDetail, reason: "Brings fever down", fit: "best" }],
      }),
    );
    const { result } = renderHook(() => useConsultation());
    act(() => result.current.send("Headache"));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));

    act(() => result.current.dismiss(ibuprofenDetail, "I don’t swallow tablets"));

    expect(result.current.caseFile.avoid).toEqual(["Tablets"]);
    expect(engine).toHaveBeenCalledTimes(1);
    const [products] = result.current.messages[1].parts;
    expect(products).toMatchObject({ kind: "products", items: [], ruledOut: 1 });
  });
});
