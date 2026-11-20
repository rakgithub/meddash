import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import "./extend.js";
import { loginBodySchema, registerBodySchema, userSchema } from "../schemas/auth.schema.js";
import {
  productDetailSchema,
  productIdParamsSchema,
  productListResponseSchema,
} from "../schemas/product.schema.js";
import {
  errorResponseSchema,
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
