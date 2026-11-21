import type { AssistantMessageBody, MessagePart } from "../../schemas/assistant.schema.js";
import { redFlagAlert } from "./redFlags.js";

export const PLACEHOLDER_REPLY =
  "Thanks, I’ve noted that. The assistant isn’t connected yet, so please ask a pharmacist for now.";

/**
 * One assistant turn as a stream of message parts. Red flags in this or any earlier user message are
 * screened first; an urgent match ends the turn with the alert alone. Phase B3 answers everything else with a fixed placeholder so the SSE
 * path works end to end; Phase B4 replaces that with the model.
 */
export async function* runTurn(input: AssistantMessageBody): AsyncGenerator<MessagePart> {
  // The server keeps no state, so it screens the user's earlier messages too: once a red flag came
  // up, every later turn gets the alert again until the conversation starts over.
  const userTexts = [...input.history.filter((m) => m.role === "user"), { text: input.userText }];
  const alert = userTexts.map((m) => redFlagAlert(m.text)).find(Boolean);
  if (alert) {
    yield alert;
    return;
  }
  yield { kind: "thinking", steps: [{ label: "Checking for warning signs", done: true }] };
  yield { kind: "text", text: PLACEHOLDER_REPLY };
}
