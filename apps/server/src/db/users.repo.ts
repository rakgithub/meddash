import { eq } from "drizzle-orm";
import type { User } from "../schemas/auth.schema.js";
import { db } from "./client.js";
import { users, type UserRow } from "./schema.js";

/** Builds the API shape field by field, so the password hash can never reach a response. */
export function toUser(row: UserRow): User {
  return { id: String(row.id), email: row.email, name: row.name, role: row.role };
}

export interface NewUser {
  email: string;
  name: string;
  passwordHash: string;
}

/** Inserts the user, or returns null when the email is already registered. */
export async function insertUser(user: NewUser): Promise<User | null> {
  // ON CONFLICT instead of check-then-insert: two concurrent sign-ups cannot both succeed.
  const rows = await db.insert(users).values(user).onConflictDoNothing().returning();
  return rows[0] ? toUser(rows[0]) : null;
}

/** For login only: the one place the password hash leaves the repo. */
export async function findUserCredentials(
  email: string,
): Promise<{ user: User; passwordHash: string } | null> {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ? { user: toUser(rows[0]), passwordHash: rows[0].passwordHash } : null;
}

export async function findUserById(id: number): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ? toUser(rows[0]) : null;
}
