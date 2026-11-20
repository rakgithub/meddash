import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { signSessionToken } from "../services/token.js";

const app = createApp();

// Tests share one database, so every account gets its own email.
const newAccount = () => ({
  email: `user-${randomUUID()}@example.com`,
  password: "correct horse",
  name: "Ana Weber",
});

const sessionCookie = (res: request.Response) => {
  const cookies: string[] = [res.headers["set-cookie"] ?? []].flat();
  return cookies.find((c) => c.startsWith("session="));
};

describe("POST /auth/register", () => {
  it("creates a customer, signs them in, and never returns the password", async () => {
    const account = newAccount();
    const res = await request(app).post("/auth/register").send(account);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.stringMatching(/^\d+$/),
      email: account.email,
      name: "Ana Weber",
      role: "customer",
    });
    const cookie = sessionCookie(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\//);
    // Not production in tests, so the cookie still works over plain http://localhost.
    expect(cookie).not.toMatch(/Secure/);
  });

  it("returns 409 for an email that is already registered, in any case", async () => {
    const account = newAccount();
    await request(app).post("/auth/register").send(account).expect(201);

    const res = await request(app)
      .post("/auth/register")
      .send({ ...account, email: account.email.toUpperCase() });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("An account with this email already exists");
    expect(sessionCookie(res)).toBeUndefined();
  });

  it.each([
    ["email", { email: "nope" }],
    ["password", { password: "short" }],
    ["name", { name: "" }],
  ])("returns 400 with details for an invalid %s", async (field, override) => {
    const res = await request(app)
      .post("/auth/register")
      .send({ ...newAccount(), ...override });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field, message: expect.any(String) }]);
  });

  it("returns 400 for a missing body", async () => {
    const res = await request(app).post("/auth/register");
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set("Content-Type", "application/json")
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Malformed JSON body");
  });
});

describe("POST /auth/login", () => {
  it("signs in with the right password", async () => {
    const account = newAccount();
    await request(app).post("/auth/register").send(account).expect(201);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: account.email.toUpperCase(), password: account.password });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: account.email, name: account.name });
    expect(sessionCookie(res)).toMatch(/HttpOnly/);
  });

  it.each([
    ["a wrong password", (a: ReturnType<typeof newAccount>) => ({ ...a, password: "wrong pass" })],
    ["an unknown email", () => ({ email: "nobody@example.com", password: "whatever1" })],
  ])("returns the same generic 401 for %s", async (_label, credentials) => {
    const account = newAccount();
    await request(app).post("/auth/register").send(account).expect(201);
    const { email, password } = credentials(account);

    const res = await request(app).post("/auth/login").send({ email, password });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid email or password");
    expect(sessionCookie(res)).toBeUndefined();
  });

  it("returns 400 for a missing password", async () => {
    const res = await request(app).post("/auth/login").send({ email: "a@b.de" });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: "password", message: expect.any(String) }]);
  });
});

describe("GET /auth/me and POST /auth/logout", () => {
  it("returns the user for a session, and 401 after logout", async () => {
    const agent = request.agent(app);
    const account = newAccount();
    const registered = await agent.post("/auth/register").send(account).expect(201);

    const me = await agent.get("/auth/me");
    expect(me.status).toBe(200);
    expect(me.body).toEqual(registered.body);

    const out = await agent.post("/auth/logout");
    expect(out.status).toBe(204);
    expect(sessionCookie(out)).toMatch(/Expires=Thu, 01 Jan 1970/);

    expect((await agent.get("/auth/me")).status).toBe(401);
  });

  it("returns 401 without a session cookie", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Not authenticated");
  });

  it.each([
    ["a forged token", "session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.bad"],
    ["a token for a deleted account", `session=${signSessionToken("2147483647")}`],
    ["a token with a non-numeric subject", `session=${signSessionToken("abc")}`],
  ])("returns 401 for %s", async (_label, cookie) => {
    const res = await request(app).get("/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });

  it("logout succeeds without a session", async () => {
    expect((await request(app).post("/auth/logout")).status).toBe(204);
  });
});
