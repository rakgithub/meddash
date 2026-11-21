import { Router } from "express";
import { assistantRouter } from "./assistant.routes.js";
import { authRouter } from "./auth.routes.js";
import { cartRouter } from "./cart.routes.js";
import { docsRouter } from "./docs.routes.js";
import { ordersRouter } from "./orders.routes.js";
import { productsRouter } from "./products.routes.js";
import { searchRouter } from "./search.routes.js";

export const router = Router();
router.use("/assistant", assistantRouter);
router.use("/auth", authRouter);
router.use("/cart", cartRouter);
router.use("/orders", ordersRouter);
router.use("/products", productsRouter);
router.use("/search", searchRouter);
router.use(docsRouter);
