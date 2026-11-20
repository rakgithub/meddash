import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// One of OWASP's equivalent scrypt settings: 16 MiB per hash (within Node's 32 MiB default),
// so concurrent logins cost less memory than N=2^17. Stored with each hash so they can change.
const N = 2 ** 14;
const R = 8;
const P = 5;
const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer, n: number, r: number, p: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: n, r, p }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

/** Returns `scrypt$N$r$p$salt$hash` (salt and hash in base64). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, n, r, p, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await derive(password, Buffer.from(salt, "base64"), Number(n), Number(r), Number(p));
  // Constant-time compare, so response time does not reveal how much of the hash matched.
  return key.length === expected.length && timingSafeEqual(key, expected);
}
