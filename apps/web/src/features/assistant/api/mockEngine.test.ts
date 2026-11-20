import { describe, expect, it, vi } from "vitest";
import type { ProductDetail } from "../../products";
import { coughSyrupDetail, ibuprofenDetail } from "../../../test/fixtures";
import type { CaseFile, Message, MessagePart } from "../types";
import { emptyCaseFile } from "../utils/caseFile";
import { createMockEngine } from "./mockEngine";

const CATALOGUE: Record<string, ProductDetail> = {
  "1": ibuprofenDetail,
  "2": {
    ...ibuprofenDetail,
    id: "2",
    name: "Paracetamol 500mg",
    price: 2.99,
    activeIngredients: ["Paracetamol 500 mg"],
  },
  "7": coughSyrupDetail,
  "8": { ...ibuprofenDetail, id: "8", name: "Throat Lozenges" },
  "11": { ...ibuprofenDetail, id: "11", name: "Ibuprofen Gel", price: 11.45 },
};

const load = vi.fn((id: string) =>
  CATALOGUE[id] ? Promise.resolve(CATALOGUE[id]) : Promise.reject(new Error("Not found")),
);
const engine = createMockEngine({ delayMs: 0, load });

const ready: CaseFile = { ...emptyCaseFile, duration: "2-3 days", forWhom: "me" };

async function collect(
  userText: string,
  { caseFile = emptyCaseFile, history = [] }: { caseFile?: CaseFile; history?: Message[] } = {},
  signal = new AbortController().signal,
) {
  const parts: MessagePart[] = [];
  for await (const part of engine({ caseFile, history, userText, signal })) parts.push(part);
  return parts;
}

const textOf = (parts: MessagePart[]) =>
  parts.flatMap((p) => (p.kind === "text" ? [p.text] : [])).join("");

const partOf = <K extends MessagePart["kind"]>(parts: MessagePart[], kind: K) =>
  parts.filter((p): p is Extract<MessagePart, { kind: K }> => p.kind === kind);

describe("mockEngine", () => {
  it("picks the symptoms out of the text and asks how long it has been going on", async () => {
    const parts = await collect("Sore throat and fever");

    expect(partOf(parts, "symptoms")).toEqual([
      { kind: "symptoms", symptoms: ["Sore throat", "Fever"] },
    ]);
    expect(partOf(parts, "quickReplies")[0]).toMatchObject({
      field: "duration",
      question: "How long has it been going on?",
    });
    expect(partOf(parts, "products")).toEqual([]);
  });

  it("doesn't read hay fever as a fever", async () => {
    const [symptoms] = partOf(await collect("Hay fever"), "symptoms");

    expect(symptoms.symptoms).toEqual(["Hay fever"]);
  });

  it("asks who it is for once the duration is known", async () => {
    const parts = await collect("2–3 days", {
      caseFile: { ...emptyCaseFile, symptoms: ["Cough"], duration: "2-3 days" },
    });

    expect(partOf(parts, "symptoms")).toEqual([]);
    expect(partOf(parts, "quickReplies")[0]).toMatchObject({ field: "forWhom" });
  });

  it("works from a symptom the user typed into the chips", async () => {
    const parts = await collect("Me", { caseFile: { ...ready, symptoms: ["bad cough"] } });

    expect(textOf(parts)).toMatch(/^A sore throat with a temperature/);
  });

  it("ticks the checks off, explains, then shows skeletons followed by ranked cards", async () => {
    const parts = await collect("Me", { caseFile: { ...ready, symptoms: ["Sore throat"] } });
    const thinking = partOf(parts, "thinking");
    const products = partOf(parts, "products");

    expect(thinking.map((p) => p.steps.filter((s) => s.done).length)).toEqual([0, 1, 2, 3, 4]);
    expect(thinking.at(-1)?.steps.at(-1)?.label).toBe("4 matches");
    expect(products[0]).toEqual({ kind: "products", items: [], loading: 4 });
    expect(products[1].items.map((i) => [i.product.name, i.fit])).toEqual([
      ["Ibuprofen 400mg", "best"],
      ["Paracetamol 500mg", "good"],
      ["Throat Lozenges", "good"],
      ["Cough Syrup", "locked"],
    ]);
    expect(products[1].items[0].reason).toBe("Brings fever down and eases throat pain");
  });

  it("counts the suggestions that failed to load", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const parts = await collect("Me", { caseFile: { ...ready, symptoms: ["Hay fever"] } });

    expect(partOf(parts, "products").at(-1)).toEqual({
      kind: "products",
      items: [],
      unavailable: 1,
    });
  });

  it("explains without products when nothing in the range fits", async () => {
    const parts = await collect("Me", { caseFile: { ...ready, symptoms: ["Upset stomach"] } });

    expect(textOf(parts)).toMatch(/upset stomach usually passes/);
    expect(partOf(parts, "products")).toEqual([]);
  });

  it.each([
    "Chest pain and a sore throat",
    "I can't breathe",
    "Her face is drooping",
    "My baby has a fever",
    "Blood in my stool",
    "I have suicidal thoughts and can't sleep",
  ])("stops at an urgent alert for %j, with no questions or products", async (text) => {
    // Even with a full case file, which would otherwise go straight to products.
    const parts = await collect(text, { caseFile: { ...ready, symptoms: ["Sore throat"] } });

    expect(partOf(parts, "alert")).toEqual([expect.objectContaining({ level: "urgent" })]);
    expect(partOf(parts, "products")).toEqual([]);
    expect(partOf(parts, "quickReplies")).toEqual([]);
    expect(partOf(parts, "symptoms")).toEqual([]);
  });

  it("asks for more detail when it doesn't recognise the symptoms", async () => {
    expect(textOf(await collect("hmm"))).toMatch(/^Tell me a bit more/);
  });

  describe("ingredients", () => {
    const shown = (product: ProductDetail): Message => ({
      id: "a1",
      role: "assistant",
      status: "done",
      parts: [{ kind: "products", items: [{ product, reason: "", fit: "best" }] }],
    });

    it("answers in one line and offers a cheaper product with the same ingredient", async () => {
      const parts = await collect("Tell me about Ibuprofen", {
        history: [shown(CATALOGUE["11"])],
      });

      expect(textOf(parts)).toMatch(/^Ibuprofen relieves pain/);
      const [item] = partOf(parts, "products").at(-1)!.items;
      expect(item.product.name).toBe("Ibuprofen 400mg");
      expect(item.reason.replace(/\s/g, " ")).toBe("Same ingredient, 4,96 € cheaper");
    });

    it("compares against the priciest shown product when several share the ingredient", async () => {
      const both: Message = {
        id: "a1",
        role: "assistant",
        status: "done",
        parts: [
          {
            kind: "products",
            items: [
              { product: ibuprofenDetail, reason: "", fit: "best" },
              { product: CATALOGUE["11"], reason: "", fit: "good" },
            ],
          },
        ],
      };
      const parts = await collect("Tell me about Ibuprofen", { history: [both] });

      const [item] = partOf(parts, "products").at(-1)!.items;
      expect(item.product.name).toBe("Ibuprofen 400mg");
      expect(item.reason).toMatch(/^Same ingredient, 4,96\s€ cheaper$/);
    });

    it("names the product a pricier alternative matches", async () => {
      const parts = await collect("Tell me about Ibuprofen", { history: [shown(ibuprofenDetail)] });

      const [item] = partOf(parts, "products").at(-1)!.items;
      expect(item.product.name).toBe("Ibuprofen Gel");
      expect(item.reason).toBe("Same ingredient as Ibuprofen 400mg");
    });

    it("shows no alternatives when the shown product is the only one", async () => {
      const parts = await collect("Tell me about Paracetamol", {
        history: [shown(CATALOGUE["2"])],
      });

      expect(textOf(parts)).toMatch(/^Paracetamol relieves/);
      expect(partOf(parts, "products")).toEqual([]);
    });

    it("says so when it doesn't know the ingredient", async () => {
      expect(textOf(await collect("Tell me about Glycerin"))).toBe(
        "I don’t have details on Glycerin yet. A pharmacist can tell you more.",
      );
    });
  });

  it("stops with the abort reason when the signal is aborted", async () => {
    const controller = new AbortController();
    const parts: MessagePart[] = [];
    const run = async () => {
      for await (const part of engine({
        caseFile: emptyCaseFile,
        history: [],
        userText: "Hay fever",
        signal: controller.signal,
      })) {
        parts.push(part);
        controller.abort();
      }
    };

    await expect(run()).rejects.toThrow();
    expect(parts).toHaveLength(1);
  });
});
