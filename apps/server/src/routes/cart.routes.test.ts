import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

const app = createApp();

// Seed facts: 1 Ibuprofen 6.49 (stock 120), 2 Paracetamol 2.99 (stock 200),
// 4 has stock 3, 7 is prescription-only, 12 is out of stock.

/** A signed-in agent with its own fresh account, so carts never collide between tests. */
async function signedIn() {
  const agent = request.agent(app);
  await agent
    .post("/auth/register")
    .send({ email: `cart-${randomUUID()}@example.com`, password: "correct horse", name: "Ana" })
    .expect(201);
  return agent;
}

const emptyCart = { items: [], itemCount: 0, subtotal: 0 };

describe("cart endpoints when signed out", () => {
  it.each([
    ["get", "/cart"],
    ["post", "/cart/items"],
    ["patch", "/cart/items/1"],
    ["delete", "/cart/items/1"],
  ] as const)("%s %s returns 401", async (method, path) => {
    const res = await request(app)[method](path).send({ productId: "1", quantity: 1 });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Not authenticated");
  });

  it("also works under the /api prefix", async () => {
    expect((await request(app).get("/api/cart")).status).toBe(401);
  });
});

describe("GET /cart", () => {
  it("is empty for a new user", async () => {
    const agent = await signedIn();
    const res = await agent.get("/cart");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(emptyCart);
  });
});

describe("POST /cart/items", () => {
  it("adds a product with the slim product shape and totals", async () => {
    const agent = await signedIn();
    const res = await agent.post("/cart/items").send({ productId: "1", quantity: 2 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [
        {
          product: {
            id: "1",
            name: "Ibuprofen 400mg",
            description: expect.any(String),
            category: "pain-relief",
            brand: "Nurofen",
            price: 6.49,
            imageUrl: expect.any(String),
          },
          quantity: 2,
          lineTotal: 12.98,
        },
      ],
      itemCount: 2,
      subtotal: 12.98,
    });
  });

  it("adds to the existing quantity and keeps lines in the order they were added", async () => {
    const agent = await signedIn();
    await agent.post("/cart/items").send({ productId: "2", quantity: 1 }).expect(200);
    await agent.post("/cart/items").send({ productId: "1", quantity: 1 }).expect(200);
    const res = await agent.post("/cart/items").send({ productId: "2", quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { product: { id: string } }) => i.product.id)).toEqual([
      "2",
      "1",
    ]);
    expect(res.body.items[0]).toMatchObject({ quantity: 4, lineTotal: 11.96 });
    expect(res.body).toMatchObject({ itemCount: 5, subtotal: 18.45 });
  });

  it("returns 409 when the total would pass 10, and leaves the cart as it was", async () => {
    const agent = await signedIn();
    await agent.post("/cart/items").send({ productId: "1", quantity: 8 }).expect(200);
    const res = await agent.post("/cart/items").send({ productId: "1", quantity: 3 });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("You can have at most 10 of a product in your cart");
    expect((await agent.get("/cart")).body.items[0].quantity).toBe(8);
  });

  it("returns 409 when the total would pass the stock", async () => {
    const agent = await signedIn();
    await agent.post("/cart/items").send({ productId: "4", quantity: 2 }).expect(200);
    const res = await agent.post("/cart/items").send({ productId: "4", quantity: 2 });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Only 3 in stock");
  });

  it.each([
    [
      "a prescription-only product",
      "7",
      409,
      "Prescription-only products cannot be added to the cart",
    ],
    ["an out-of-stock product", "12", 409, "This product is out of stock"],
    ["an unknown product", "9999", 404, "Product not found"],
  ])("rejects %s", async (_label, productId, status, message) => {
    const agent = await signedIn();
    const res = await agent.post("/cart/items").send({ productId, quantity: 1 });
    expect(res.status).toBe(status);
    expect(res.body.error.message).toBe(message);
  });

  it.each([
    ["productId", { productId: "abc", quantity: 1 }],
    ["quantity", { productId: "1", quantity: 0 }],
    ["quantity", { productId: "1", quantity: 11 }],
  ])("returns 400 with details for an invalid %s", async (field, body) => {
    const agent = await signedIn();
    const res = await agent.post("/cart/items").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field, message: expect.any(String) }]);
  });

  it("returns 400 for an unknown field such as a client-sent price", async () => {
    const agent = await signedIn();
    const res = await agent.post("/cart/items").send({ productId: "1", quantity: 1, price: 0 });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /cart/items/:productId", () => {
  it("replaces the quantity", async () => {
    const agent = await signedIn();
    await agent.post("/cart/items").send({ productId: "1", quantity: 5 }).expect(200);
    const res = await agent.patch("/cart/items/1").send({ quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ itemCount: 2, subtotal: 12.98 });
  });

  it("returns 409 above the stock", async () => {
    const agent = await signedIn();
    await agent.post("/cart/items").send({ productId: "4", quantity: 1 }).expect(200);
    const res = await agent.patch("/cart/items/4").send({ quantity: 4 });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Only 3 in stock");
  });

  it("returns 404 for a product that is not in the cart", async () => {
    const agent = await signedIn();
    const res = await agent.patch("/cart/items/1").send({ quantity: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("This product is not in your cart");
  });

  it("returns 400 for an invalid id or quantity", async () => {
    const agent = await signedIn();
    const badId = await agent.patch("/cart/items/abc").send({ quantity: 1 });
    expect(badId.status).toBe(400);
    expect(badId.body.error.details).toEqual([{ field: "productId", message: expect.any(String) }]);
    const badQuantity = await agent.patch("/cart/items/1").send({ quantity: 11 });
    expect(badQuantity.status).toBe(400);
    expect(badQuantity.body.error.details).toEqual([
      { field: "quantity", message: expect.any(String) },
    ]);
  });
});

describe("DELETE /cart/items/:productId", () => {
  it("removes the line", async () => {
    const agent = await signedIn();
    await agent.post("/cart/items").send({ productId: "1", quantity: 1 }).expect(200);
    await agent.post("/cart/items").send({ productId: "2", quantity: 1 }).expect(200);
    const res = await agent.delete("/cart/items/1");
    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { product: { id: string } }) => i.product.id)).toEqual(["2"]);
  });

  it("succeeds for a product that is not in the cart", async () => {
    const agent = await signedIn();
    const res = await agent.delete("/cart/items/1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(emptyCart);
  });

  it("returns 400 for an invalid id", async () => {
    const agent = await signedIn();
    expect((await agent.delete("/cart/items/0")).status).toBe(400);
  });
});

describe("cart ownership", () => {
  it("keeps each user's cart to themselves", async () => {
    const ana = await signedIn();
    const ben = await signedIn();
    await ana.post("/cart/items").send({ productId: "1", quantity: 2 }).expect(200);

    expect((await ben.get("/cart")).body).toEqual(emptyCart);
    // Ben cannot change or remove Ana's line through the shared product id.
    expect((await ben.patch("/cart/items/1").send({ quantity: 5 })).status).toBe(404);
    await ben.delete("/cart/items/1").expect(200);
    expect((await ana.get("/cart")).body.items[0].quantity).toBe(2);
  });
});
