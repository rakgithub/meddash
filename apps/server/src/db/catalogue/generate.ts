import type { ProductDetail } from "../../schemas/product.schema.js";
import { brands as allBrands, type Brand, type PriceTier } from "./brands.js";
import { imageUrlFor } from "./images.js";
import { productTypes as allTypes, type Form, type ProductType } from "./productTypes.js";

/** A product ready to upsert: the detail shape without an id (the database assigns it). */
export type CatalogueProduct = Omit<ProductDetail, "id" | "sku"> & { sku: string };

const TIER_FACTOR: Record<PriceTier, number> = { budget: 0.8, standard: 1, premium: 1.35 };

/** FNV-1a: a small, stable string hash. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 seeded from a string: the same seed always gives the same sequence in [0, 1). */
export function seededRandom(seed: string): () => number {
  let state = hash(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** "400 mg" -> "400", "0.05 %" -> "0P05", "" -> "X": the digits are what tell strengths apart. */
function strengthCode(strength: string): string {
  const digits = strength.match(/[\d.]+/)?.[0];
  return digits ? digits.replace(".", "P") : "X";
}

/**
 * Built only from the combination's own codes, so adding types, forms or brands never changes an
 * existing SKU. That is what lets a re-run update rows instead of adding duplicates.
 */
export function skuFor(
  type: ProductType,
  form: Form,
  strength: string,
  pack: number,
  brand: Brand,
): string {
  return `MD-${type.code}-${strengthCode(strength)}-${form.code}-${pack}-${brand.code}`;
}

/** Rounds to the nearest price ending in .49 or .99, like a shelf price. */
export function roundPrice(value: number): number {
  const whole = Math.floor(value);
  const candidates = [whole - 0.01, whole + 0.49, whole + 0.99].filter((c) => c >= 0.49);
  const nearest = candidates.reduce((best, c) =>
    Math.abs(c - value) < Math.abs(best - value) ? c : best,
  );
  return Number(nearest.toFixed(2));
}

/** Bigger packs cost more but less per unit; each higher strength costs 15 % more. */
export function priceFor(form: Form, strengthIndex: number, pack: number, tier: PriceTier): number {
  const packFactor = (pack / form.packs[0]) ** 0.75;
  const strengthFactor = 1 + 0.15 * strengthIndex;
  return roundPrice(form.basePrice * packFactor * strengthFactor * TIER_FACTOR[tier]);
}

/** 2 to 5 brands for one combination, chosen by a generator seeded from the combination itself. */
function pickBrands(comboKey: string, brands: Brand[]): Brand[] {
  const random = seededRandom(comboKey);
  const shuffled = [...brands];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 2 + Math.floor(random() * 4));
}

function buildProduct(
  type: ProductType,
  form: Form,
  strengthIndex: number,
  pack: number,
  brand: Brand,
): CatalogueProduct {
  const strength = form.strengths[strengthIndex];
  const sku = skuFor(type, form, strength, pack, brand);
  const random = seededRandom(sku);
  const packSize = `${pack} ${form.unit}`;
  const blurb = [
    type.description,
    `${type.description} Pack of ${packSize}.`,
    `${brand.name}: ${type.description}`,
  ][Math.floor(random() * 3)];
  const [first, ...rest] = type.activeIngredients;

  return {
    sku,
    name: [brand.name, type.name, strength, form.label].filter(Boolean).join(" "),
    description: blurb,
    category: type.category,
    brand: brand.name,
    price: priceFor(form, strengthIndex, pack, brand.tier),
    imageUrl: imageUrlFor(type.imageKey, type.category, form.imageForm, hash(sku)),
    // Made-up numbers would look like real PZNs and could match real medicines.
    pzn: null,
    packSize,
    dosageForm: form.dosageForm,
    activeIngredients: first ? [[first, strength].filter(Boolean).join(" "), ...rest] : [],
    usageInstructions: form.usage,
    warnings: type.warnings,
    requiresPrescription: type.requiresPrescription ?? false,
    // About 5 % out of stock.
    stockQuantity: random() < 0.05 ? 0 : 1 + Math.floor(random() * 300),
    manufacturer: brand.manufacturer,
  };
}

/**
 * Expands every type into strength x form x pack combinations, gives each 2 to 5 brands, and keeps
 * at most `target` products. Same tables in, same products out, sorted by SKU. Over the target,
 * the cut is by SKU hash, so it spreads over all categories instead of dropping the last ones.
 */
export function generateCatalogue(
  target = 1000,
  types: ProductType[] = allTypes,
  brands: Brand[] = allBrands,
): CatalogueProduct[] {
  const all: CatalogueProduct[] = [];
  for (const type of types) {
    for (const form of type.forms) {
      form.strengths.forEach((strength, strengthIndex) => {
        for (const pack of form.packs) {
          const comboKey = `${type.code}-${strengthCode(strength)}-${form.code}-${pack}`;
          for (const brand of pickBrands(comboKey, brands)) {
            all.push(buildProduct(type, form, strengthIndex, pack, brand));
          }
        }
      });
    }
  }
  const kept =
    all.length > target ? all.sort((a, b) => hash(a.sku) - hash(b.sku)).slice(0, target) : all;
  return kept.sort((a, b) => (a.sku < b.sku ? -1 : 1));
}
