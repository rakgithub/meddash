import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../client.js";
import { cartItems, carts, products, users } from "../schema.js";
import { findExistingSkus, upsertProductsBySku, type Executor } from "./catalogue.repo.js";
import type { CatalogueProduct } from "./generate.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

class Rollback extends Error {}

/** Runs `fn` in a transaction and rolls it back, so the shared test catalogue stays untouched. */
async function inRollback(fn: (tx: Tx) => Promise<void>) {
  let failure: unknown;
  try {
    await db.transaction(async (tx) => {
      try {
        await fn(tx);
      } catch (error) {
        failure = error;
      }
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
  if (failure) throw failure;
}

function product(sku: string, overrides: Partial<CatalogueProduct> = {}): CatalogueProduct {
  return {
    sku,
    name: "Test Ibuprofen 400 mg film-coated tablets",
    description: "d",
    category: "pain-relief",
    brand: "Medilo",
    price: 4.99,
    imageUrl: "https://images.unsplash.com/photo-1?w=600",
    pzn: null,
    packSize: "20 tablets",
    dosageForm: "Film-coated tablet",
    activeIngredients: ["Ibuprofen 400 mg"],
    usageInstructions: "u",
    warnings: "w",
    requiresPrescription: false,
    stockQuantity: 10,
    manufacturer: "Medilo Pharma",
    ...overrides,
  };
}

const rowFor = async (tx: Executor & Tx, sku: string) =>
  (await tx.select().from(products).where(eq(products.sku, sku)))[0];

describe("upsertProductsBySku", () => {
  it("inserts new SKUs, then updates the same ones on a second run", async () => {
    await inRollback(async (tx) => {
      const sku = `TEST-${randomUUID()}`;
      expect(await upsertProductsBySku([product(sku)], tx)).toEqual({ inserted: 1, updated: 0 });

      const result = await upsertProductsBySku([product(sku, { price: 5.49, name: "New" })], tx);
      expect(result).toEqual({ inserted: 0, updated: 1 });

      const row = await rowFor(tx, sku);
      expect(row.name).toBe("New");
      expect(row.price).toBe("5.49");
      expect((await tx.select().from(products).where(eq(products.sku, sku))).length).toBe(1);
    });
  });

  it("counts a mixed batch", async () => {
    await inRollback(async (tx) => {
      const [a, b] = [`TEST-${randomUUID()}`, `TEST-${randomUUID()}`];
      await upsertProductsBySku([product(a)], tx);
      expect(await upsertProductsBySku([product(a), product(b)], tx)).toEqual({
        inserted: 1,
        updated: 1,
      });
    });
  });

  it("keeps the stock an order may have changed", async () => {
    await inRollback(async (tx) => {
      const sku = `TEST-${randomUUID()}`;
      await upsertProductsBySku([product(sku, { stockQuantity: 10 })], tx);
      await tx.update(products).set({ stockQuantity: 3 }).where(eq(products.sku, sku));

      await upsertProductsBySku([product(sku, { stockQuantity: 250 })], tx);
      expect((await rowFor(tx, sku)).stockQuantity).toBe(3);
    });
  });

  it("keeps the product id, so cart items still point at it", async () => {
    await inRollback(async (tx) => {
      const sku = `TEST-${randomUUID()}`;
      await upsertProductsBySku([product(sku)], tx);
      const { id } = await rowFor(tx, sku);
      const [user] = await tx
        .insert(users)
        .values({ email: `cat-${randomUUID()}@example.com`, name: "Ana", passwordHash: "x" })
        .returning({ id: users.id });
      const [cart] = await tx.insert(carts).values({ userId: user.id }).returning({ id: carts.id });
      await tx.insert(cartItems).values({ cartId: cart.id, productId: id, quantity: 2 });

      await upsertProductsBySku([product(sku, { price: 9.99 })], tx);

      expect((await rowFor(tx, sku)).id).toBe(id);
      const items = await tx.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
      expect(items).toEqual([expect.objectContaining({ productId: id, quantity: 2 })]);
    });
  });

  it("does nothing for an empty batch", async () => {
    expect(await upsertProductsBySku([])).toEqual({ inserted: 0, updated: 0 });
  });
});

describe("findExistingSkus", () => {
  it("returns only the SKUs that exist", async () => {
    await inRollback(async (tx) => {
      const [have, missing] = [`TEST-${randomUUID()}`, `TEST-${randomUUID()}`];
      await upsertProductsBySku([product(have)], tx);
      expect(await findExistingSkus([have, missing], tx)).toEqual(new Set([have]));
    });
  });

  it("returns an empty set for no SKUs", async () => {
    expect(await findExistingSkus([])).toEqual(new Set());
  });
});
