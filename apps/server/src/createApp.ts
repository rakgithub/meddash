import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { router } from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  // The web project's Vercel rewrite forwards the original path (/api/products), while the routes
  // live at the root, as with the Vite dev proxy. Strip the prefix so both setups hit the same routes.
  app.use((req, _res, next) => {
    req.url = req.url.replace(/^\/api(?=[/?]|$)/, "") || "/";
    next();
  });

  app.use(cors());
  // Room for a full assistant request (20 history messages cut to their limits, in any script).
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());

  app.use(router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
