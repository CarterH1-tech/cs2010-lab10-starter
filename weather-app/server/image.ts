// OpenRouter image-to-image generation: transforms the reference image
// (panther-snow.jpg) so it matches the current time of day, season, and weather.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import type { WeatherReport } from "./weather.ts";

const MODEL = "qwen/qwen-image-2.1-turbo";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/images";

// Relative to the `server/` directory (this file).
const REF_IMAGE_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "panther-snow.jpg");

export function buildPrompt(w: WeatherReport): string {
  const c = w.current;
  const ahead = w.forecast
    .slice(1, 5)
    .map((p) => `${p.name}: ${p.shortForecast}${p.temperatureC != null ? `, ${p.temperatureC}°C` : ""}`)
    .join("; ");

  return [
    `Take this reference photo of Plymouth, New Hampshire, USA and modify it to match the following conditions.`,
    ``,
    `SEASON: it is ${w.now.season} (${w.now.date}).`,
    `TIME OF DAY: ${w.now.timeOfDay} (local time ${w.now.local}).`,
    `CURRENT WEATHER: ${c.shortForecast}; ${c.temperatureC}°C (${c.temperatureF}°F); wind ${c.windSpeed} from ${c.windDirection}` +
      (c.humidity != null ? `; humidity ${c.humidity}%` : "") +
      (c.precipitationChance != null ? `; ${c.precipitationChance}% chance of precipitation` : "") +
      `.`,
    `FORECAST AHEAD: ${ahead}.`,
    ``,
    `Repaint the scene so the sky, lighting, and landscape match that season, time of day, and weather. ` +
      `For example: snow and gray sky in winter; colorful leaves in fall; bright sun in summer; ` +
      `rain, clouds, fog, or clear stars depending on the forecast. ` +
      `Keep the same composition, subject, and point of view as the original photo.`,
  ].join("\n");
}

export interface GeneratedImage {
  imageUrl: string; // data URL
  prompt: string;
}

export async function generateWeatherImage(w: WeatherReport): Promise<GeneratedImage> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const prompt = buildPrompt(w);

  const refBytes = await readFile(REF_IMAGE_PATH);
  const refUrl = `data:image/jpeg;base64,${refBytes.toString("base64")}`;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      input_references: [{ type: "image_url", image_url: { url: refUrl } }],
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(`OpenRouter HTTP ${response.status}: ${body?.error?.message ?? "request failed"}`);
  }

  const result = (await response.json()) as {
    data?: Array<{ b64_json?: string; media_type?: string }>;
  };
  const image = result.data?.[0];
  if (!image?.b64_json) {
    throw new Error("OpenRouter returned no image data");
  }

  const mime = image.media_type ?? "image/png";
  return { imageUrl: `data:${mime};base64,${image.b64_json}`, prompt };
}