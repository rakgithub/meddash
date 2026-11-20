import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "./token.js";

const secret = "s".repeat(32);

describe("session tokens", () => {
  it("round-trips the user id", () => {
    expect(verifySessionToken(signSessionToken("42", secret), secret)).toBe("42");
  });

  it("rejects a token signed with another secret", () => {
    expect(verifySessionToken(signSessionToken("42", "o".repeat(32)), secret)).toBeNull();
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign({ sub: "42", exp: Math.floor(Date.now() / 1000) - 10 }, secret);
    expect(verifySessionToken(expired, secret)).toBeNull();
  });

  it("rejects an unsigned (alg none) token", () => {
    const unsigned = jwt.sign({ sub: "42" }, "", { algorithm: "none" });
    expect(verifySessionToken(unsigned, secret)).toBeNull();
  });

  it("rejects a token without a subject", () => {
    expect(verifySessionToken(jwt.sign({}, secret), secret)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verifySessionToken("not.a.jwt", secret)).toBeNull();
  });
});
