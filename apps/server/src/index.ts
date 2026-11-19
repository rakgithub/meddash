import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { pool } from "./db/client.js";

const server = createApp().listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`${signal} received, shutting down`);
  // Finish in-flight requests before closing the DB pool they use.
  server.close(() => {
    pool.end().then(
      () => process.exit(0),
      (err: unknown) => {
        console.error("Failed to close the DB pool:", err);
        process.exit(1);
      },
    );
  });
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
