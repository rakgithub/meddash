import { formatPrice, formatStock, type ProductDetail } from "../../products";

export type CompareRowKey =
  "ingredients" | "form" | "packSize" | "price" | "unitPrice" | "warnings" | "stock";

export interface CompareRow {
  key: CompareRowKey;
  label: string;
  /** One display value per product, in the order the products were given. */
  values: string[];
  /** True when the products don't all have the same value, so the row is worth a look. */
  differs: boolean;
}

export interface UnitPrice {
  amount: number;
  /** Singular, e.g. "tablet" or "ml". */
  unit: string;
}

const NONE = "—";
const PACK_SIZE = /^(\d+(?:[.,]\d+)?)\s*(.+)$/;

// Unit prices are often a few cents, so they show up to three decimals.
const unitFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

/** The price of one tablet, ml, etc., read from a pack size like "20 tablets". Null when it can't be read. */
export function unitPrice(product: ProductDetail): UnitPrice | null {
  const match = PACK_SIZE.exec(product.packSize ?? "");
  if (!match) return null;
  const count = Number(match[1].replace(",", "."));
  if (count <= 0) return null;
  return { amount: product.price / count, unit: match[2].trim().replace(/s$/i, "") };
}

export function formatUnitPrice({ amount, unit }: UnitPrice): string {
  return `${unitFormatter.format(amount)} per ${unit}`;
}

function row(
  key: CompareRowKey,
  label: string,
  products: ProductDetail[],
  value: (product: ProductDetail) => string,
): CompareRow {
  const values = products.map(value);
  return { key, label, values, differs: new Set(values).size > 1 };
}

/** The side-by-side rows for a few products. */
export function compareProducts(products: ProductDetail[]): CompareRow[] {
  return [
    row("ingredients", "Active ingredients", products, (p) =>
      p.activeIngredients.length > 0 ? p.activeIngredients.join(", ") : NONE,
    ),
    row("form", "Dosage form", products, (p) => p.dosageForm ?? NONE),
    row("packSize", "Pack size", products, (p) => p.packSize ?? NONE),
    row("price", "Price", products, (p) => formatPrice(p.price)),
    row("unitPrice", "Price per unit", products, (p) => {
      const perUnit = unitPrice(p);
      return perUnit ? formatUnitPrice(perUnit) : NONE;
    }),
    row("warnings", "Warnings", products, (p) => p.warnings ?? "None listed"),
    row("stock", "Stock", products, (p) => formatStock(p.stockQuantity)),
  ];
}
