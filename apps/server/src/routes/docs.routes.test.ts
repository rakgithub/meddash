import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();

describe("OpenAPI docs", () => {
  it("serves a spec describing /search and its query params", async () => {
    const res = await request(app).get("/openapi.json");
    expect(res.status).toBe(200);
    const op = res.body.paths["/search"].get;
    expect(op.parameters.map((p: { name: string }) => p.name)).toEqual([
      "q",
      "category",
      "brand",
      "minPrice",
      "maxPrice",
      "sort",
      "page",
    ]);
    expect(res.body.paths).toHaveProperty(["/products", "get"]);
    expect(res.body.components.schemas).toHaveProperty("Product");
  });

  it("documents imageUrl on Product as a nullable URL", async () => {
    const res = await request(app).get("/openapi.json");
    const product = res.body.components.schemas.Product;
    expect(product.properties.imageUrl).toMatchObject({
      type: "string",
      format: "uri",
      nullable: true,
    });
    expect(product.required).toContain("imageUrl");
  });

  it("documents /search/suggest with its q param and response schema", async () => {
    const res = await request(app).get("/openapi.json");
    const op = res.body.paths["/search/suggest"].get;
    expect(op.parameters).toEqual([expect.objectContaining({ name: "q", required: true })]);
    expect(Object.keys(op.responses)).toEqual(["200", "400"]);
    expect(res.body.components.schemas).toHaveProperty("SuggestResponse");
    expect(res.body.components.schemas).toHaveProperty("Suggestion");
  });

  it("documents /search/facets with the search filters and its response schemas", async () => {
    const res = await request(app).get("/openapi.json");
    const op = res.body.paths["/search/facets"].get;
    expect(op.parameters.map((p: { name: string }) => p.name)).toEqual([
      "q",
      "category",
      "brand",
      "minPrice",
      "maxPrice",
    ]);
    expect(Object.keys(op.responses)).toEqual(["200", "400"]);
    expect(res.body.components.schemas).toHaveProperty("FacetsResponse");
    expect(res.body.components.schemas).toHaveProperty("FacetValue");
    expect(res.body.components.schemas).toHaveProperty("PriceBucket");
  });

  it("documents /products/{id} with its id param, responses and ProductDetail schema", async () => {
    const res = await request(app).get("/openapi.json");
    const op = res.body.paths["/products/{id}"].get;
    expect(op.parameters).toEqual([
      expect.objectContaining({ name: "id", in: "path", required: true }),
    ]);
    expect(Object.keys(op.responses)).toEqual(["200", "400", "404"]);
    const detail = res.body.components.schemas.ProductDetail;
    // ProductDetail extends Product, so the spec is Product plus an object of the extra fields.
    expect(detail.allOf[0]).toEqual({ $ref: "#/components/schemas/Product" });
    expect(detail.allOf[1].required).toEqual(
      expect.arrayContaining(["sku", "pzn", "requiresPrescription", "stockQuantity"]),
    );
  });

  it("documents the auth endpoints, their responses and the session cookie scheme", async () => {
    const res = await request(app).get("/openapi.json");
    const { paths, components } = res.body;
    expect(Object.keys(paths["/auth/register"].post.responses)).toEqual(["201", "400", "409"]);
    expect(Object.keys(paths["/auth/login"].post.responses)).toEqual(["200", "400", "401"]);
    expect(Object.keys(paths["/auth/logout"].post.responses)).toEqual(["204"]);
    expect(Object.keys(paths["/auth/me"].get.responses)).toEqual(["200", "401"]);
    expect(paths["/auth/me"].get.security).toEqual([{ cookieAuth: [] }]);
    expect(components.securitySchemes.cookieAuth).toMatchObject({ in: "cookie", name: "session" });
    expect(Object.keys(components.schemas.User.properties)).toEqual([
      "id",
      "email",
      "name",
      "role",
    ]);
  });

  it("documents the cart endpoints behind the session cookie, with their responses", async () => {
    const res = await request(app).get("/openapi.json");
    const { paths, components } = res.body;
    const cart = paths["/cart"].get;
    const add = paths["/cart/items"].post;
    const update = paths["/cart/items/{productId}"].patch;
    const remove = paths["/cart/items/{productId}"].delete;

    expect(Object.keys(cart.responses)).toEqual(["200", "401"]);
    expect(Object.keys(add.responses)).toEqual(["200", "400", "401", "404", "409"]);
    expect(Object.keys(update.responses)).toEqual(["200", "400", "401", "404", "409"]);
    expect(Object.keys(remove.responses)).toEqual(["200", "400", "401"]);
    for (const op of [cart, add, update, remove]) {
      expect(op.security).toEqual([{ cookieAuth: [] }]);
    }
    for (const op of [update, remove]) {
      expect(op.parameters).toEqual([
        expect.objectContaining({ name: "productId", in: "path", required: true }),
      ]);
    }
    expect(Object.keys(components.schemas.Cart.properties)).toEqual([
      "items",
      "itemCount",
      "subtotal",
    ]);
    expect(Object.keys(components.schemas.CartLine.properties)).toEqual([
      "product",
      "quantity",
      "lineTotal",
    ]);
  });

  it("serves Swagger UI", async () => {
    const res = await request(app).get("/docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });
});
