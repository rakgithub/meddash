import { formatPrice, type ProductDetail } from "../../products";
import type { AssistantEngine, Message, MessagePart, QuickReply, Recommendation } from "../types";
import { mergeSymptoms } from "../utils/caseFile";
import { ingredientName } from "../utils/ingredientName";
import { rankRecommendations } from "../utils/rankRecommendations";
import { redFlagAlert } from "../utils/redFlags";
import { loadProducts, type LoadProduct } from "./loadProducts";

/**
 * A scripted stand-in for the real assistant, so the chat can be built and demoed before the backend
 * exists. Only the reasoning is scripted: the suggested products are real catalogue products (by their
 * seeded ids), loaded through the products API.
 */

type FlowId = "cold" | "hayFever" | "pain" | "sleep" | "stomach";

interface Pick {
  id: string;
  reason: string;
  fit: "best" | "good";
}

interface Flow {
  reply: string;
  picks: Pick[];
}

// Hay fever comes before fever, and "fever" skips "hay fever", so hay fever isn't read as a cold.
const SYMPTOMS: { label: string; match: RegExp; flow: FlowId }[] = [
  { label: "Hay fever", match: /hay ?fever|allerg|pollen/i, flow: "hayFever" },
  { label: "Sneezing", match: /sneez/i, flow: "hayFever" },
  { label: "Itchy eyes", match: /itchy eyes/i, flow: "hayFever" },
  { label: "Sore throat", match: /throat/i, flow: "cold" },
  { label: "Fever", match: /(?<!hay ?)fever|temperature/i, flow: "cold" },
  { label: "Cough", match: /cough/i, flow: "cold" },
  { label: "Blocked nose", match: /blocked nose|stuffy|congest/i, flow: "cold" },
  { label: "Cold", match: /\bcold\b|\bflu\b/i, flow: "cold" },
  { label: "Headache", match: /headache|migraine/i, flow: "pain" },
  { label: "Muscle pain", match: /muscle|back pain|sprain|joint/i, flow: "pain" },
  { label: "Trouble sleeping", match: /sleep|insomnia|awake/i, flow: "sleep" },
  { label: "Upset stomach", match: /stomach|bloat/i, flow: "stomach" },
  { label: "Nausea", match: /nause/i, flow: "stomach" },
  { label: "Diarrhoea", match: /diarrh/i, flow: "stomach" },
  { label: "Heartburn", match: /heartburn|indigestion/i, flow: "stomach" },
];

const FLOWS: Record<FlowId, Flow> = {
  hayFever: {
    reply:
      "Hay fever responds well to over-the-counter treatment.\n\n" +
      "When a blocked nose is the main problem, a decongestant nasal spray clears it within minutes. " +
      "Use it for a week at most. For sneezing and itchy eyes, ask a pharmacist about an antihistamine.",
    picks: [{ id: "6", reason: "Clears a blocked nose within minutes", fit: "best" }],
  },
  cold: {
    reply:
      "A sore throat with a temperature is most often a cold or flu, and it usually settles within a week.\n\n" +
      "Two things tend to help: a pain reliever that also brings fever down, such as ibuprofen or paracetamol, " +
      "and lozenges for the soreness.\n\n" +
      "See a doctor if your fever goes above 39 °C or lasts more than three days.",
    picks: [
      { id: "1", reason: "Brings fever down and eases throat pain", fit: "best" },
      { id: "2", reason: "Gentler on the stomach, also lowers fever", fit: "good" },
      { id: "8", reason: "Numbs a sore throat between doses", fit: "good" },
      { id: "7", reason: "Ivy leaf syrup that loosens a cough", fit: "good" },
    ],
  },
  pain: {
    reply:
      "Most headaches and muscle aches ease with a simple pain reliever and rest.\n\n" +
      "Ibuprofen also reduces swelling; paracetamol is gentler on the stomach. " +
      "For a sore muscle or joint, a gel works where you rub it in.\n\n" +
      "See a doctor if the pain is sudden and severe, or keeps coming back.",
    picks: [
      { id: "1", reason: "Eases pain and reduces swelling", fit: "best" },
      { id: "2", reason: "Gentle on the stomach", fit: "good" },
      { id: "11", reason: "Works where you rub it in, for muscles and joints", fit: "good" },
    ],
  },
  sleep: {
    reply:
      "Trouble sleeping for a few nights is common, often after stress or a change in routine.\n\n" +
      "A regular bedtime and no screens for the last hour help most. " +
      "Magnesium in the evening can help tense muscles relax.\n\n" +
      "If it has lasted more than three weeks, talk to your doctor.",
    picks: [{ id: "5", reason: "Helps tense muscles relax in the evening", fit: "best" }],
  },
  stomach: {
    reply:
      "An upset stomach usually passes within a day or two.\n\n" +
      "Drink plenty of fluids and eat small, plain meals. " +
      "We don’t stock stomach remedies online yet, so ask a pharmacist about oral rehydration salts or an antacid.\n\n" +
      "See a doctor if you see blood, have a high fever, or it lasts more than three days.",
    picks: [],
  },
};

/** Ingredient names (lower case, as `ingredientName` gives them) to a one-line answer and its products. */
const INGREDIENTS: { name: string; about: string; productIds: string[] }[] = [
  {
    name: "ibuprofen",
    about: "Ibuprofen relieves pain, brings fever down and reduces swelling. Take it with food.",
    productIds: ["1", "11"],
  },
  {
    name: "paracetamol",
    about: "Paracetamol relieves pain and fever and is gentle on the stomach.",
    productIds: ["2"],
  },
  {
    name: "xylometazoline hydrochloride",
    about: "Xylometazoline shrinks swollen blood vessels in the nose. Use it for 7 days at most.",
    productIds: ["6"],
  },
  {
    name: "amylmetacresol",
    about: "Amylmetacresol is a mild antiseptic that soothes a sore throat.",
    productIds: ["8"],
  },
  {
    name: "dichlorobenzyl alcohol",
    about: "Dichlorobenzyl alcohol is a mild antiseptic that soothes a sore throat.",
    productIds: ["8"],
  },
  {
    name: "ivy leaf dry extract",
    about: "Ivy leaf extract loosens mucus so a cough clears more easily.",
    productIds: ["7"],
  },
  {
    name: "magnesium oxide",
    about: "Magnesium supports muscles and nerves; too much can loosen the stools.",
    productIds: ["5"],
  },
];

const DURATIONS: QuickReply[] = [
  { label: "Since today", value: "today" },
  { label: "2–3 days", value: "2-3 days" },
  { label: "About a week", value: "a week" },
  { label: "Longer", value: "longer" },
];

const FOR_WHOM_OPTIONS: QuickReply[] = [
  { label: "Me", value: "me" },
  { label: "A child", value: "child" },
  { label: "Someone pregnant", value: "pregnant" },
  { label: "Someone over 65", value: "senior" },
];

const FALLBACK =
  "Tell me a bit more so I can help. Where does it bother you, and how long has it been going on?";

const CHECKS = ["Understanding symptoms", "Checking catalogue", "Filtering prescription-only"];

const ASK_ABOUT = /^tell me about (.+)$/i;

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

function symptomsIn(text: string): string[] {
  return SYMPTOMS.filter((s) => s.match.test(text)).map((s) => s.label);
}

/** The flow of the first symptom that has one, so a symptom the user typed in works too. */
function flowFor(symptoms: string[]): Flow | undefined {
  for (const symptom of symptoms) {
    const known = SYMPTOMS.find((s) => s.match.test(symptom));
    if (known) return FLOWS[known.flow];
  }
  return undefined;
}

function matchesLabel(count: number) {
  if (count === 0) return "No matches in our range";
  return count === 1 ? "1 match" : `${count} matches`;
}

/**
 * The suggested product to compare alternatives against. When several shown products share the
 * ingredient, the priciest one is used, so a cheaper option is what gets pointed out.
 */
function referenceProduct(history: Message[], name: string): ProductDetail | undefined {
  return history
    .flatMap((m) =>
      m.parts.flatMap((p) => (p.kind === "products" ? p.items.map((i) => i.product) : [])),
    )
    .filter((product) =>
      product.activeIngredients.some((i) => ingredientName(i).toLowerCase() === name),
    )
    .reduce<ProductDetail | undefined>(
      (top, p) => (top && top.price >= p.price ? top : p),
      undefined,
    );
}

function alternativeReason(product: ProductDetail, reference: ProductDetail | undefined) {
  if (!reference) return "Contains this ingredient";
  const saving = reference.price - product.price;
  if (saving > 0) return `Same ingredient, ${formatPrice(saving)} cheaper`;
  return `Same ingredient as ${reference.name}`;
}

interface MockEngineOptions {
  /** Scales every pause; tests pass 0. */
  delayMs?: number;
  load?: LoadProduct;
}

export function createMockEngine({ delayMs = 1, load }: MockEngineOptions = {}): AssistantEngine {
  async function* stream(text: string, signal: AbortSignal): AsyncGenerator<MessagePart> {
    for (const token of tokens(text)) {
      await wait(28 * delayMs, signal);
      yield { kind: "text", text: token };
    }
  }

  async function* think(labels: string[], signal: AbortSignal): AsyncGenerator<MessagePart> {
    for (let done = 0; done <= labels.length; done++) {
      yield { kind: "thinking", steps: labels.map((label, i) => ({ label, done: i < done })) };
      if (done < labels.length) await wait(450 * delayMs, signal);
    }
  }

  /** Shows a skeleton per product, then the cards that loaded. */
  async function* recommend(
    ids: string[],
    toRecommendation: (product: ProductDetail) => Recommendation,
    signal: AbortSignal,
  ): AsyncGenerator<MessagePart> {
    yield { kind: "products", items: [], loading: ids.length };
    const { products, unavailable } = await loadProducts(ids, signal, load);
    yield {
      kind: "products",
      items: rankRecommendations(products.map(toRecommendation)),
      unavailable,
    };
  }

  async function* aboutIngredient(
    asked: string,
    history: Message[],
    signal: AbortSignal,
  ): AsyncGenerator<MessagePart> {
    const name = asked.trim().toLowerCase();
    const entry = INGREDIENTS.find((i) => i.name === name);
    if (!entry) {
      yield* stream(
        `I don’t have details on ${asked} yet. A pharmacist can tell you more.`,
        signal,
      );
      return;
    }
    yield* stream(entry.about, signal);

    const reference = referenceProduct(history, name);
    const ids = entry.productIds.filter((id) => id !== reference?.id);
    if (ids.length === 0) return;
    yield* recommend(
      ids,
      (product) => ({ product, reason: alternativeReason(product, reference), fit: "good" }),
      signal,
    );
  }

  return async function* mockEngine({
    caseFile,
    history,
    userText,
    signal,
  }): AsyncGenerator<MessagePart> {
    // Urgent symptoms come before everything else: no questions and no products, only a doctor.
    const alert = redFlagAlert(userText);
    if (alert) {
      yield* think(["Checking for urgent signs"], signal);
      yield alert;
      return;
    }

    const asked = ASK_ABOUT.exec(userText.trim());
    if (asked) {
      yield* aboutIngredient(asked[1], history, signal);
      return;
    }

    const found = symptomsIn(userText);
    // Newly described symptoms lead, so a new complaint later in the chat gets its own answer.
    const flow = flowFor(mergeSymptoms(found, caseFile.symptoms));

    if (!flow) {
      yield* think([CHECKS[0]], signal);
      yield* stream(FALLBACK, signal);
      return;
    }

    if (found.length > 0) {
      yield* think([CHECKS[0]], signal);
      yield { kind: "symptoms", symptoms: found };
    }

    if (!caseFile.duration) {
      yield* stream(
        "Thanks. A couple of quick questions so I can suggest the right thing.",
        signal,
      );
      yield {
        kind: "quickReplies",
        question: "How long has it been going on?",
        field: "duration",
        options: DURATIONS,
      };
      return;
    }

    if (!caseFile.forWhom) {
      yield {
        kind: "quickReplies",
        question: "Who is it for?",
        field: "forWhom",
        options: FOR_WHOM_OPTIONS,
      };
      return;
    }

    yield* think([...CHECKS, matchesLabel(flow.picks.length)], signal);
    yield* stream(flow.reply, signal);
    if (flow.picks.length === 0) return;

    const picks = new Map(flow.picks.map((pick) => [pick.id, pick]));
    yield* recommend(
      flow.picks.map((pick) => pick.id),
      (product) => {
        const pick = picks.get(product.id);
        return { product, reason: pick?.reason ?? "", fit: pick?.fit ?? "good" };
      },
      signal,
    );
  };
}

export const mockEngine = createMockEngine();
