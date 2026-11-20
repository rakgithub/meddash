import type { AssistantEngine, MessagePart } from "../types";

/**
 * A scripted stand-in for the real assistant, so the chat can be built and demoed before the backend
 * exists. Only the reasoning is scripted; later phases attach real catalogue products.
 */

interface Flow {
  match: RegExp;
  finding: string;
  reply: string;
}

// Hay fever comes first: "fever" alone would otherwise match the cold and flu script.
const FLOWS: Flow[] = [
  {
    match: /hay ?fever|allerg|sneez|pollen|itchy eyes/i,
    finding: "3 matches",
    reply:
      "Hay fever responds well to over-the-counter treatment.\n\n" +
      "A once-a-day antihistamine tablet such as cetirizine covers sneezing and itchy eyes. " +
      "A nasal spray helps when a blocked nose is the main problem, and eye drops soothe itching quickly.",
  },
  {
    match: /throat|fever|cold|cough|flu/i,
    finding: "3 matches",
    reply:
      "A sore throat with a temperature is most often a cold or flu, and it usually settles within a week.\n\n" +
      "Two things tend to help: a pain reliever that also brings fever down, such as ibuprofen or paracetamol, " +
      "and lozenges or a throat spray for the soreness.\n\n" +
      "See a doctor if your fever goes above 39 °C or lasts more than three days.",
  },
  {
    match: /sleep|insomnia|awake/i,
    finding: "2 matches",
    reply:
      "Trouble sleeping for a few nights is common, often after stress or a change in routine.\n\n" +
      "Plant-based remedies with valerian or lemon balm are a gentle first step. " +
      "Sleep aids with an antihistamine work faster but can leave you drowsy the next morning.\n\n" +
      "If it has lasted more than three weeks, talk to your doctor.",
  },
  {
    match: /stomach|nausea|diarrh|heartburn|indigestion|bloat/i,
    finding: "3 matches",
    reply:
      "An upset stomach usually passes within a day or two.\n\n" +
      "Drink plenty of fluids. Oral rehydration salts help after diarrhoea, " +
      "and an antacid eases heartburn or indigestion.\n\n" +
      "See a doctor if you see blood, have a high fever, or it lasts more than three days.",
  },
];

const FALLBACK =
  "Tell me a bit more so I can help. Where does it bother you, and how long has it been going on?";

const CHECKS = ["Understanding symptoms", "Checking catalogue", "Filtering prescription-only"];

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/** Words with their trailing whitespace, so the streamed deltas join back into the exact text. */
function tokens(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

/** `delayMs` scales every pause; tests pass 0. */
export function createMockEngine(delayMs = 1): AssistantEngine {
  return async function* mockEngine({ userText, signal }): AsyncGenerator<MessagePart> {
    const flow = FLOWS.find((f) => f.match.test(userText));
    const labels = flow ? [...CHECKS, flow.finding] : [CHECKS[0]];

    for (let done = 0; done <= labels.length; done++) {
      yield { kind: "thinking", steps: labels.map((label, i) => ({ label, done: i < done })) };
      if (done < labels.length) await wait(450 * delayMs, signal);
    }

    for (const token of tokens(flow?.reply ?? FALLBACK)) {
      await wait(28 * delayMs, signal);
      yield { kind: "text", text: token };
    }
  };
}

export const mockEngine = createMockEngine();
