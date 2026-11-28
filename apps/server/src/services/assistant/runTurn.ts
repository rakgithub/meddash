import type Anthropic from "@anthropic-ai/sdk";
import type { AssistantMessageBody, MessagePart } from "../../schemas/assistant.schema.js";
import { buildMessages, SYSTEM } from "./prompt.js";
import { redFlagAlert } from "./redFlags.js";
import { runTool, TOOLS, type ToolContext } from "./tools.js";

/** Cost guardrails from the plan. */
export const MAX_TOOL_ROUNDS = 4;
export const MAX_TOKENS = 1024;

export const REFUSAL_REPLY =
  "I can’t help with that here. Please ask one of our pharmacists, who can advise you directly.";

/** What the loop needs from a finished model reply; `Anthropic.Message` has all of it. */
export interface ModelReply {
  content: Anthropic.ContentBlock[];
  stop_reason: Anthropic.StopReason | null;
  usage: Pick<
    Anthropic.Usage,
    "input_tokens" | "output_tokens" | "cache_read_input_tokens" | "cache_creation_input_tokens"
  >;
}

/** The part of the SDK's `MessageStream` the loop uses, so tests can pass a fake. */
export interface ModelStream extends AsyncIterable<Anthropic.MessageStreamEvent> {
  finalMessage(): Promise<ModelReply>;
}

export type StreamModel = (
  params: Anthropic.MessageStreamParams,
  signal: AbortSignal,
) => ModelStream;

/** One line per turn for usage and cost. Numbers only: message text is health data. */
export interface TurnLog {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  toolRounds: number;
  durationMs: number;
  stopReason: Anthropic.StopReason | null;
}

export interface TurnDeps extends Pick<ToolContext, "searchCatalogue" | "findProductById"> {
  stream: StreamModel;
  model: string;
  signal: AbortSignal;
  logTurn: (log: TurnLog) => void;
}

const WARNING_STEP = { label: "Checking for warning signs", done: true };
const searching = (done: boolean): MessagePart => ({
  kind: "thinking",
  steps: [WARNING_STEP, { label: "Searching the catalogue", done }],
});

export const emptyLog = (model: string): TurnLog => ({
  model,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  toolRounds: 0,
  durationMs: 0,
  stopReason: null,
});

/** Adds one model reply's tokens to the log and keeps its stop reason. */
export function addUsage(log: TurnLog, reply: ModelReply): void {
  log.inputTokens += reply.usage.input_tokens;
  log.outputTokens += reply.usage.output_tokens;
  log.cacheReadTokens += reply.usage.cache_read_input_tokens ?? 0;
  log.cacheWriteTokens += reply.usage.cache_creation_input_tokens ?? 0;
  log.stopReason = reply.stop_reason;
}

export const isToolUse = (block: Anthropic.ContentBlock): block is Anthropic.ToolUseBlock =>
  block.type === "tool_use";

/**
 * One assistant turn as a stream of message parts. Red flags in this or any earlier user message are
 * screened first; an urgent match ends the turn with the alert alone and no model call. Otherwise the
 * model answers, using tools for at most MAX_TOOL_ROUNDS rounds; the call after the last round may not
 * use tools, so the user always gets an answer.
 */
export async function* runTurn(
  input: AssistantMessageBody,
  deps: TurnDeps,
): AsyncGenerator<MessagePart> {
  // The server keeps no state, so it screens the user's earlier messages too: once a red flag came
  // up, every later turn gets the alert again until the conversation starts over.
  const userTexts = [...input.history.filter((m) => m.role === "user"), { text: input.userText }];
  const alert = userTexts.map((m) => redFlagAlert(m.text)).find(Boolean);
  if (alert) {
    yield alert;
    return;
  }
  yield { kind: "thinking", steps: [WARNING_STEP] };

  const ctx: ToolContext = {
    caseFile: input.caseFile,
    seenIds: new Set(),
    searchCatalogue: deps.searchCatalogue,
    findProductById: deps.findProductById,
  };
  const messages = buildMessages(input);
  const started = Date.now();
  const log = emptyLog(deps.model);

  try {
    for (let round = 0; ; round++) {
      const lastCall = round === MAX_TOOL_ROUNDS;
      const stream = deps.stream(
        {
          model: deps.model,
          max_tokens: MAX_TOKENS,
          output_config: { effort: "low" },
          // Moves a cache breakpoint to the end of each request, so the next tool round reads the
          // conversation so far from the cache instead of paying for it again. SYSTEM keeps its own.
          cache_control: { type: "ephemeral" },
          system: SYSTEM,
          tools: TOOLS,
          messages,
          ...(lastCall ? { tool_choice: { type: "none" as const } } : {}),
        },
        deps.signal,
      );
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { kind: "text", text: event.delta.text };
        }
      }
      const reply = await stream.finalMessage();
      addUsage(log, reply);

      if (reply.stop_reason === "refusal") {
        yield { kind: "text", text: REFUSAL_REPLY };
        return;
      }
      // Anything else (end_turn, max_tokens, ...) ends the turn; a tool call cut off by max_tokens
      // never runs.
      const calls = reply.content.filter(isToolUse);
      if (reply.stop_reason !== "tool_use" || calls.length === 0 || lastCall) return;

      log.toolRounds++;
      const searches = calls.some((c) => c.name === "search_products");
      if (searches) yield searching(false);
      const outcomes = await Promise.all(calls.map((c) => runTool(c.name, c.input, ctx)));
      if (searches) yield searching(true);
      for (const outcome of outcomes) yield* outcome.parts;

      // A question that was shown waits for the user's answer, so the model has nothing more to do
      // this turn. A rejected one goes back to the model as an error instead.
      if (outcomes.some((o) => o.parts.some((p) => p.kind === "quickReplies"))) return;

      messages.push(
        { role: "assistant", content: reply.content },
        {
          role: "user",
          // All results in one message, so the model keeps making parallel calls.
          content: calls.map((call, i) => ({
            type: "tool_result",
            tool_use_id: call.id,
            content: outcomes[i].result,
            is_error: outcomes[i].isError,
          })),
        },
      );
    }
  } finally {
    log.durationMs = Date.now() - started;
    deps.logTurn(log);
  }
}

/** Production logger: one JSON line on stdout, picked up by the host's log drain. */
export function logTurnToStdout(log: TurnLog): void {
  process.stdout.write(`${JSON.stringify({ event: "assistant_turn", ...log })}\n`);
}

/** The same line for a compare question, under its own event name so costs can be told apart. */
export function logCompareToStdout(log: TurnLog): void {
  process.stdout.write(`${JSON.stringify({ event: "assistant_compare", ...log })}\n`);
}
