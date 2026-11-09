// Express server for the weather app.
// Dev:  Vite (5173) proxies /api -> this server (3000).
// Prod: `npm run build` then this server serves dist/ + /api on one port.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

import { getWeather } from "./weather.ts";
import { generateWeatherImage } from "./image.ts";

const PORT = Number(process.env.PORT ?? 3000);
const SERVER_DIR = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(SERVER_DIR, "..");
const DIST_DIR = join(APP_DIR, "dist");

// --- Load OPENROUTER_API_KEY from openrouter.env if not already in env. ---
function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  }
}
loadEnvFile(join(SERVER_DIR, "openrouter.env")); // weather-app/server/openrouter.env
loadEnvFile(join(SERVER_DIR, "..", "openrouter.env")); // weather-app/openrouter.env
loadEnvFile(join(SERVER_DIR, "..", "..", "openrouter.env")); // lab root openrouter.env

const app = express();
app.use(express.json({ limit: "10mb" }));

app.get("/api/weather", async (_req, res) => {
  try {
    const report = await getWeather();
    res.json(report);
  } catch (err) {
    console.error("weather error:", err);
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

app.post("/api/weather-image", async (_req, res) => {
  try {
    const report = await getWeather();
    const result = await generateWeatherImage(report);
    console.log("generated image, prompt:", result.prompt.split("\n").slice(2, 5).join(" | "));
    res.json({ ...result, weather: report });
  } catch (err) {
    console.error("image generation error:", err);
    res.status(502).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// --- Production: serve the built frontend. ---
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // Express 5 uses named wildcards; a bare `*` no longer compiles.
  app.get("/*splat", (_req, res) => {
    res.sendFile(resolve(DIST_DIR, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`weather-app server listening on http://localhost:${PORT}`);
  console.log(`OPENROUTER_API_KEY is ${process.env.OPENROUTER_API_KEY ? "set" : "NOT set"}`);
});