import { Router } from "express";
import { login, logout, me, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validateBody } from "../middleware/validate.js";
import { loginBodySchema, registerBodySchema } from "../schemas/auth.schema.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerBodySchema), register);
authRouter.post("/login", validateBody(loginBodySchema), login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
