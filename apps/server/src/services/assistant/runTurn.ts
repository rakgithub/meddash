import type { AssistantMessageBody, MessagePart } from "../../schemas/assistant.schema.js";
import { redFlagAlert } from "./redFlags.js";

export const PLACEHOLDER_REPLY =
  "Thanks, I’ve noted that. The assistant isn’t connected yet, so please ask a pharmacist for now.";

/**
 * One assistant turn as a stream of message parts. Red flags are screened first; an urgent match ends
 * the turn with the alert alone. Phase B3 answers everything else with a fixed placeholder so the SSE
 * path works end to end; Phase B4 replaces that with the model.
 */
export async function* runTurn(input: AssistantMessageBody): AsyncGenerator<MessagePart> {
  const alert = redFlagAlert(input.userText);
  if (alert) {
    yield alert;
    return;
  }
  yield { kind: "thinking", steps: [{ label: "Checking for warning signs", done: true }] };
  yield { kind: "text", text: PLACEHOLDER_REPLY };
}
