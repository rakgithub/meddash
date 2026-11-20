import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../createApp.js";
import { db } from "../db/client.js";
import { products } from "../db/schema.js";

const app = createApp();

// Seed facts: 1 Ibuprofen 6.49 (stock 120), 2 Paracetamol 2.99 (stock 200), 10 Moisturising
// Cream 14.90 (stock changed by the rollback test only, then restored).

/** A signed-in agent with its own fresh account, so carts and orders never collide. */
async function signedIn() {
  const agent = request.agent(app);
  await agent
    .post("/auth/register")
    .send({ email: `orders-${randomUUID()}@example.com`, password: "correct horse", name: "Ana" })
    .expect(201);
  return agent;
}

describe("orders endpoints when signed out", () => {
  it.each([
    ["post", "/orders"],
    ["get", "/orders"],
    ["get", "/orders/1"],
  ] as const)("%s %s returns 401", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });
});

describe("POST /orders", () => {
  it("creates a pending order from the cart and empties the cart", async () => {
    const agent = await signedIn();
    await agent.post("/cart/items").send({ productId: "1", quantity: 2 }).expect(200);
    await agent.post("/cart/items").send({ productId: "2", quantity: 1 }).expect(200);

    const res = await agent.post("/orders");

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      status: "pending_payment",
      total: 15.97,
      itemCount: 3,
      createdAt: expect.any(String),
      items: [
        { productId: "1", name: "Ibuprofen 400mg", unitPrice: 6.49, quantity: 2, lineTotal: 12.98 },
        {
          productId: "2",
          name: "Paracetamol 500mg",
          unitPrice: 2.99,
          quantity: 1,
          lineTotal: 2.99,
        },
      ],
    });
    const cart = await agent.get("/cart");
    expect(cart.body).toEqual({ items: [], itemCount: 0, subtotal: 0 });
  });

  it("returns 409 for an empty cart and creates nothing", async () => {
    const agent = await signedIn();
    const res = await agent.post("/orders");
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Your cart is empty");
    expect((await agent.get("/orders")).body).toEqual({ orders: [] });
  });

  it("returns 409 and rolls back when stock dropped below the cart quantity", async () => {
    const agent = await signedIn();
    await agent.post("/cart/items").send({ productId: "10", quantity: 3 }).expect(200);
    const [before] = await db.select().from(products).where(eq(products.id, 10));
    await db.update(products).set({ stockQuantity: 2 }).where(eq(products.id, 10));
    try {
      const res = await agent.post("/orders");
      expect(res.status).toBe(409);
      expect(res.body.error.message).toBe("Only 2 of Moisturising Cream in stock");
    } finally {
      await db
        .update(products)
        .set({ stockQuantity: before.stockQuantity })
        .where(eq(products.id, 10));
    }
    expect((await agent.get("/orders")).body).toEqual({ orders: [] });
    expect((await agent.get("/cart")).body.itemCount).toBe(3);
  });

  it("creates only one order when placed twice at once", async () => {
    const agent = await signedIn();
    await agent.post("/cart/items").send({ productId: "1", quantity: 1 }).expect(200);
    const statuses = (await Promise.all([agent.post("/orders"), agent.post("/orders")]))
      .map((r) => r.status)
      .sort();
    expect(statuses).toEqual([201, 409]);
  });
});

describe("GET /orders", () => {
  it("lists the user's orders newest first", async () => {
    const agent = await signedIn();
    await agent.post("/cart/items").send({ productId: "1", quantity: 1 }).expect(200);
    const first = (await agent.post("/orders")).body;
    await agent.post("/cart/items").send({ productId: "2", quantity: 2 }).expect(200);
    const second = (await agent.post("/orders")).body;

    const res = await agent.get("/orders");

    expect(res.status).toBe(200);
    expect(res.body.orders).toEqual([
      {
        id: second.id,
        status: "pending_payment",
        total: 5.98,
        itemCount: 2,
        createdAt: expect.any(String),
      },
      {
        id: first.id,
        status: "pending_payment",
        total: 6.49,
        itemCount: 1,
        createdAt: expect.any(String),
      },
    ]);
  });

  it("does not list another user's orders", async () => {
    const owner = await signedIn();
    await owner.post("/cart/items").send({ productId: "1", quantity: 1 }).expect(200);
    await owner.post("/orders").expect(201);
    const other = await signedIn();
    expect((await other.get("/orders")).body).toEqual({ orders: [] });
  });
});

describe("GET /orders/:id", () => {
  it("returns 404 for another user's order", async () => {
    const owner = await signedIn();
    await owner.post("/cart/items").send({ productId: "1", quantity: 1 }).expect(200);
    const { id } = (await owner.post("/orders")).body;
    const other = await signedIn();

    const res = await other.get(`/orders/${id}`);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("Order not found");
  });

  it("returns 404 for an unknown id", async () => {
    const agent = await signedIn();
    expect((await agent.get("/orders/2147483647")).status).toBe(404);
  });

  it.each(["abc", "0", "-1", "1.5", "2147483648"])("returns 400 for id %s", async (id) => {
    const agent = await signedIn();
    expect((await agent.get(`/orders/${id}`)).status).toBe(400);
  });
});
