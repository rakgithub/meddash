import { formatPrice, formatStock, type ProductDetail } from "../../products";
import { formatUnitPrice, unitPrice, type CompareRowKey } from "../utils/compareProducts";

/**
 * A scripted stand-in for the assistant's answers while the compare drawer is open. Like the mock
 * engine, only the wording is scripted; the answers are worked out from the real product data.
 */
export interface CompareAnswer {
  text: string;
  /** The table row the answer is about; the drawer highlights it. */
  row: CompareRowKey | null;
}

// Warning phrases that point to the stomach, as in "Do not use with stomach ulcers".
const STOMACH_WARNING = /stomach|ulcer|gastr|laxative|loose stools/i;

const FALLBACK: CompareAnswer = {
  row: null,
  text: "I can compare ingredients, dosage form, pack size, price, warnings and stock. Try asking which is cheapest or gentler on the stomach.",
};

function names(products: ProductDetail[]): string {
  const list = products.map((p) => p.name);
  if (list.length < 2) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
}

/** "Name: value" for every product, e.g. for the pack sizes. */
function perProduct(products: ProductDetail[], value: (p: ProductDetail) => string): string {
  return products.map((p) => `${p.name}: ${value(p)}`).join(". ") + ".";
}

function stomach(products: ProductDetail[]): CompareAnswer {
  const gentle = products.filter((p) => !STOMACH_WARNING.test(p.warnings ?? ""));
  const warned = products.filter((p) => STOMACH_WARNING.test(p.warnings ?? ""));
  const row = "warnings";
  if (warned.length === 0) {
    return { row, text: "None of these has a stomach warning, so they look equally gentle." };
  }
  if (gentle.length === 0) {
    return {
      row,
      text: "All of them have a stomach-related warning. A pharmacist can say which suits you best.",
    };
  }
  const verb = gentle.length === 1 ? "is" : "are";
  const warns = warned.length === 1 ? "has" : "have";
  return {
    row,
    text: `${names(gentle)} ${verb} gentler on the stomach. ${names(warned)} ${warns} a stomach warning.`,
  };
}

function cheapest<T>(items: T[], cost: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>(
    (best, item) => (best === undefined || cost(item) < cost(best) ? item : best),
    undefined,
  );
}

function price(products: ProductDetail[]): CompareAnswer {
  const priced = products.flatMap((product) => {
    const perUnit = unitPrice(product);
    return perUnit ? [{ product, perUnit }] : [];
  });
  // Per-unit prices only compare when every product has one in the same unit (tablets vs ml don't).
  const comparable =
    priced.length === products.length &&
    priced.every((p) => p.perUnit.unit === priced[0]?.perUnit.unit);
  const bestPerUnit = comparable ? cheapest(priced, (p) => p.perUnit.amount) : undefined;
  if (bestPerUnit) {
    return {
      row: "unitPrice",
      text: `${bestPerUnit.product.name} is cheapest: ${formatUnitPrice(bestPerUnit.perUnit)}.`,
    };
  }
  const best = cheapest(products, (p) => p.price);
  if (!best) return FALLBACK;
  return { row: "price", text: `${best.name} costs least: ${formatPrice(best.price)}.` };
}

function stock(products: ProductDetail[]): CompareAnswer {
  const short = products.filter((p) => formatStock(p.stockQuantity) !== "In stock");
  const text =
    short.length === 0
      ? "All of them are in stock."
      : perProduct(short, (p) => formatStock(p.stockQuantity)) + " The rest are in stock.";
  return { row: "stock", text };
}

const TOPICS: { match: RegExp; answer: (products: ProductDetail[]) => CompareAnswer }[] = [
  { match: /stomach|gentle|gentler|ulcer|digest/i, answer: stomach },
  { match: /price|cheap|cost|expens|afford|value/i, answer: price },
  { match: /stock|availab/i, answer: stock },
  {
    match: /pack|size|how many|quantity/i,
    answer: (products) => ({
      row: "packSize",
      text: perProduct(products, (p) => p.packSize ?? "not listed"),
    }),
  },
  {
    match: /ingredient|contain|active/i,
    answer: (products) => ({
      row: "ingredients",
      text: perProduct(products, (p) => p.activeIngredients.join(", ") || "not listed"),
    }),
  },
  {
    match: /form|tablet|capsule|syrup|spray|cream|lozenge|swallow/i,
    answer: (products) => ({
      row: "form",
      text: perProduct(products, (p) => p.dosageForm ?? "not listed"),
    }),
  },
  {
    match: /warning|safe|pregnan|child|side effect|careful/i,
    answer: () => ({
      row: "warnings",
      text: "Each product’s warnings are in the highlighted row. A pharmacist can say which fits you.",
    }),
  },
];

export function answerCompareQuestion(question: string, products: ProductDetail[]): CompareAnswer {
  const topic = TOPICS.find((t) => t.match.test(question));
  return topic ? topic.answer(products) : FALLBACK;
}
