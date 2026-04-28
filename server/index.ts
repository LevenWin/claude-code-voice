import express from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { REPO_WEB_DIST } from "./lib/paths.ts";
import configRoute from "./routes/config.ts";
import credentialsRoute from "./routes/credentials.ts";
import installRoute from "./routes/install.ts";
import previewRoute from "./routes/preview.ts";
import logsRoute from "./routes/logs.ts";

const PORT = Number(process.env.CCVOICE_PORT ?? 7654);
const HOST = process.env.CCVOICE_HOST ?? "127.0.0.1";

export async function startServer(): Promise<{ port: number; host: string }> {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/config", configRoute);
  app.use("/api/credentials", credentialsRoute);
  app.use("/api/install", installRoute);
  app.use("/api/preview", previewRoute);
  app.use("/api/logs", logsRoute);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Static web (production build)
  const webDistExists = await fs
    .access(REPO_WEB_DIST)
    .then(() => true)
    .catch(() => false);

  if (webDistExists) {
    app.use(express.static(REPO_WEB_DIST));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(REPO_WEB_DIST, "index.html"));
    });
  } else {
    app.get("/", (_req, res) => {
      res.type("html").send(
        `<!doctype html><meta charset="utf-8"><title>Claude Code Voice</title>
         <body style="font-family: system-ui; padding: 40px; max-width: 600px;">
         <h1>Claude Code Voice — server running</h1>
         <p>Web UI is not built yet. Run <code>npm run build</code> first, or use <code>npm run dev</code> for development (Vite proxy on :5173).</p>
         <p>API health: <a href="/api/health">/api/health</a></p>
         </body>`
      );
    });
  }

  return new Promise((resolve) => {
    app.listen(PORT, HOST, () => resolve({ port: PORT, host: HOST }));
  });
}

// Allow `tsx server/index.ts` to start the server directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().then(({ port, host }) => {
    // eslint-disable-next-line no-console
    console.log(`[claude-code-voice] http://${host}:${port}`);
  });
}
