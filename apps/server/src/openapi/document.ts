import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import "./extend.js";
import {
  addCartItemBodySchema,
  cartItemParamsSchema,
  cartSchema,
  updateCartItemBodySchema,
} from "../schemas/cart.schema.js";
import { orderListSchema, orderParamsSchema, orderSchema } from "../schemas/orders.schema.js";
import { loginBodySchema, registerBodySchema, userSchema } from "../schemas/auth.schema.js";
import {
  productDetailSchema,
  productIdParamsSchema,
  productListResponseSchema,
} from "../schemas/product.schema.js";
import { facetsResponseSchema } from "../schemas/facets.schema.js";
import {
  errorResponseSchema,
  facetsQuerySchema,
  searchQuerySchema,
  searchResponseSchema,
} from "../schemas/search.schema.js";
import { suggestQuerySchema, suggestResponseSchema } from "../schemas/suggest.schema.js";

const registry = new OpenAPIRegistry();

const cookieAuth = registry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: "session",
  description: "httpOnly JWT session cookie set by register and login",
});

const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });
const sessionCookie = {
  "Set-Cookie": { description: "The `session` cookie", schema: { type: "string" as const } },
};

registry.registerPath({
  method: "post",
  path: "/auth/register",
  summary: "Create an account",
  description: "Creates a customer account and signs it in (sets the session cookie).",
  tags: ["Auth"],
  request: { body: { required: true, ...json(registerBodySchema) } },
  responses: {
    201: { description: "The new user", headers: sessionCookie, ...json(userSchema) },
    400: { description: "Invalid body", ...json(errorResponseSchema) },
    409: { description: "Email already registered", ...json(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  summary: "Sign in",
  tags: ["Auth"],
  request: { body: { required: true, ...json(loginBodySchema) } },
  responses: {
    200: { description: "The signed-in user", headers: sessionCookie, ...json(userSchema) },
    400: { description: "Invalid body", ...json(errorResponseSchema) },
    401: { description: "Invalid email or password", ...json(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  summary: "Sign out",
  description: "Clears the session cookie. Succeeds whether or not the caller was signed in.",
  tags: ["Auth"],
  responses: { 204: { description: "Signed out", headers: sessionCookie } },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  summary: "The signed-in user",
  tags: ["Auth"],
  security: [{ [cookieAuth.name]: [] }],
  responses: {
    200: { description: "The signed-in user", ...json(userSchema) },
    401: { description: "Not signed in or session expired", ...json(errorResponseSchema) },
  },
});

const cartAuth = [{ [cookieAuth.name]: [] }];
const cartResponses = {
  200: { description: "The whole cart after the change", ...json(cartSchema) },
  401: { description: "Not signed in or session expired", ...json(errorResponseSchema) },
};
const cartChangeErrors = {
  400: { description: "Invalid body or product id", ...json(errorResponseSchema) },
  404: { description: "Unknown product", ...json(errorResponseSchema) },
  409: {
    description: "Prescription-only, out of stock, or more than the stock or the per-product limit",
    ...json(errorResponseSchema),
  },
};

registry.registerPath({
  method: "get",
  path: "/cart",
  summary: "The signed-in user's cart",
  description: "Prices are the current ones from the catalogue. Empty when nothing was added yet.",
  tags: ["Cart"],
  security: cartAuth,
  responses: { ...cartResponses, 200: { description: "The cart", ...json(cartSchema) } },
});

registry.registerPath({
  method: "post",
  path: "/cart/items",
  summary: "Add a product to the cart",
  description: "Adds `quantity` to what is already in the cart for that product.",
  tags: ["Cart"],
  security: cartAuth,
  request: { body: { required: true, ...json(addCartItemBodySchema) } },
  responses: { ...cartResponses, ...cartChangeErrors },
});

registry.registerPath({
  method: "patch",
  path: "/cart/items/{productId}",
  summary: "Set the quantity of a cart line",
  tags: ["Cart"],
  security: cartAuth,
  request: {
    params: cartItemParamsSchema,
    body: { required: true, ...json(updateCartItemBodySchema) },
  },
  responses: {
    ...cartResponses,
    ...cartChangeErrors,
    404: { description: "Unknown product, or not in the cart", ...json(errorResponseSchema) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/cart/items/{productId}",
  summary: "Remove a product from the cart",
  description: "Succeeds when the product was not in the cart.",
  tags: ["Cart"],
  security: cartAuth,
  request: { params: cartItemParamsSchema },
  responses: {
    ...cartResponses,
    400: { description: "Invalid product id", ...json(errorResponseSchema) },
  },
});

const unauthorized = {
  description: "Not signed in or session expired",
  ...json(errorResponseSchema),
};

registry.registerPath({
  method: "post",
  path: "/orders",
  summary: "Place an order from the cart",
  description:
    "In one transaction: re-checks stock and current prices, creates the order as `pending_payment` with the lines and prices copied from the cart, and empties the cart. Nothing changes if any check fails.",
  tags: ["Orders"],
  security: cartAuth,
  responses: {
    201: { description: "The new order", ...json(orderSchema) },
    401: unauthorized,
    409: {
      description: "Empty cart, or a line is prescription-only or no longer in stock",
      ...json(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/orders",
  summary: "The signed-in user's orders, newest first",
  tags: ["Orders"],
  security: cartAuth,
  responses: {
    200: { description: "The orders", ...json(orderListSchema) },
    401: unauthorized,
  },
});

registry.registerPath({
  method: "get",
  path: "/orders/{id}",
  summary: "One order with its items",
  tags: ["Orders"],
  security: cartAuth,
  request: { params: orderParamsSchema },
  responses: {
    200: { description: "The order", ...json(orderSchema) },
    400: { description: "Invalid order id", ...json(errorResponseSchema) },
    401: unauthorized,
    404: {
      description: "No such order, or it belongs to another user",
      ...json(errorResponseSchema),
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/products",
  summary: "List all products",
  tags: ["Products"],
  responses: {
    200: {
      description: "Every product in the catalogue",
      content: { "application/json": { schema: productListResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/products/{id}",
  summary: "Get one product",
  description: "The full product detail. The list and search endpoints return a slimmer shape.",
  tags: ["Products"],
  request: { params: productIdParamsSchema },
  responses: {
    200: {
      description: "The product with all detail fields",
      content: { "application/json": { schema: productDetailSchema } },
    },
    400: {
      description: "Invalid product id",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    404: {
      description: "No product with this id",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/search",
  summary: "Search products",
  tags: ["Search"],
  request: { query: searchQuerySchema },
  responses: {
    200: {
      description: "Matching products, one page",
      content: { "application/json": { schema: searchResponseSchema } },
    },
    400: {
      description: "Invalid query parameters",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/search/facets",
  summary: "Filter counts and price spread",
  description:
    "For the filter UI. Takes the same filters as `/search`. Each facet ignores its own filter, so the counts show what picking another value would give.",
  tags: ["Search"],
  request: { query: facetsQuerySchema },
  responses: {
    200: {
      description: "Counts per category and brand, and the price spread",
      content: { "application/json": { schema: facetsResponseSchema } },
    },
    400: {
      description: "Invalid query parameters",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/search/suggest",
  summary: "Autocomplete suggestions",
  description:
    "Up to 5 products whose name or brand starts with `q` (case-insensitive). Name matches rank first.",
  tags: ["Search"],
  request: { query: suggestQuerySchema },
  responses: {
    200: {
      description: "Matching products, at most 5",
      content: { "application/json": { schema: suggestResponseSchema } },
    },
    400: {
      description: "Missing or invalid `q`",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

export function buildOpenApiDocument() {
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.3",
    info: { title: "MedDash API", version: "0.0.1" },
  });
}
