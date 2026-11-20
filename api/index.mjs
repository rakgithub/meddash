// Vercel serverless entry: runs the Express app built by `pnpm --filter server build`.
import { createApp } from "../apps/server/dist/app.js";

const app = createApp();

export default function handler(req, res) {
  // The web app calls /api/*; the Express routes are mounted at the root (as in the Vite dev proxy).
  req.url = req.url.replace(/^\/api(?=[/?]|$)/, "") || "/";
  return app(req, res);
}
