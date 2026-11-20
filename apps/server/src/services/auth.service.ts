import { AppError } from "../errors/AppError.js";
import { findUserById, findUserCredentials, insertUser } from "../db/users.repo.js";
import type { LoginBody, RegisterBody, User } from "../schemas/auth.schema.js";
import { hashPassword, verifyPassword } from "./password.js";

// One message for unknown email and wrong password, so login cannot probe for accounts.
export const INVALID_CREDENTIALS = "Invalid email or password";

export async function registerUser(input: RegisterBody, insert = insertUser): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  const user = await insert({ email: input.email, name: input.name, passwordHash });
  if (!user) throw new AppError(409, "An account with this email already exists");
  return user;
}

// Hashed once, lazily: verified against when the email is unknown so both paths take as long.
let dummyHash: Promise<string> | undefined;

export async function loginUser(input: LoginBody, find = findUserCredentials): Promise<User> {
  const found = await find(input.email);
  if (!found) {
    dummyHash ??= hashPassword("dummy password for timing");
    await verifyPassword(input.password, await dummyHash);
    throw new AppError(401, INVALID_CREDENTIALS);
  }
  if (!(await verifyPassword(input.password, found.passwordHash))) {
    throw new AppError(401, INVALID_CREDENTIALS);
  }
  return found.user;
}

/** The signed-in user; 401 when the account behind a valid token no longer exists. */
export async function getCurrentUser(userId: number, find = findUserById): Promise<User> {
  const user = await find(userId);
  if (!user) throw new AppError(401, "Not authenticated");
  return user;
}
