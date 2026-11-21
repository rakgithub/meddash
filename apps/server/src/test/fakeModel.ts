import type Anthropic from "@anthropic-ai/sdk";
import type { ModelReply, ModelStream, StreamModel } from "../services/assistant/runTurn.js";

/** One scripted model reply: text streamed as deltas, then optional tool calls. */
export interface ScriptedReply {
  text?: string[];
  tools?: { name: string; input: unknown }[];
  stopReason?: Anthropic.StopReason;
}

const usage = {
  input_tokens: 100,
  output_tokens: 20,
  cache_read_input_tokens: 80,
  cache_creation_input_tokens: 0,
};

function toStream(reply: ScriptedReply, round: number): ModelStream {
  const deltas = (reply.text ?? []).map((text): Anthropic.MessageStreamEvent => ({
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text },
  }));
  const content: Anthropic.ContentBlock[] = [
    ...(reply.text ? [{ type: "text" as const, text: reply.text.join(""), citations: null }] : []),
    ...(reply.tools ?? []).map((tool, i) => ({
      type: "tool_use" as const,
      id: `toolu_${round}_${i}`,
      name: tool.name,
      input: tool.input,
      caller: { type: "direct" as const },
    })),
  ];
  const final: ModelReply = {
    content,
    stop_reason: reply.stopReason ?? (reply.tools ? "tool_use" : "end_turn"),
    usage,
  };
  return {
    async *[Symbol.asyncIterator]() {
      yield* deltas;
    },
    finalMessage: () => Promise.resolve(final),
  };
}

/**
 * A stand-in for `client.messages.stream` that plays the replies in order and records each request.
 * Requests are copied, because the loop keeps appending to the same `messages` array.
 */
export function fakeModel(replies: ScriptedReply[]) {
  const requests: Anthropic.MessageStreamParams[] = [];
  const signals: AbortSignal[] = [];
  const stream: StreamModel = (params, signal) => {
    const round = requests.length;
    requests.push(structuredClone(params));
    signals.push(signal);
    const reply = replies[round];
    if (!reply) throw new Error(`No scripted reply for request ${round + 1}`);
    return toStream(reply, round);
  };
  return { stream, requests, signals };
}
