// Mirrors apps/server/src/schemas/auth.schema.ts.
export interface User {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin";
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

// Keep in sync with PASSWORD_MIN in the server schema.
export const PASSWORD_MIN = 8;
