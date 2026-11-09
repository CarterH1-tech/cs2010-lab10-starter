# Weather Portrait (Lab 10, Part 2)

An Express + Vite/React app that shows the current weather in Plymouth, NH and
repaints a reference photo to match the current **time of day**, **season**, and
**forecast**.

It uses:

- **NWS weather API** (free, no key) for current conditions and forecast:
  `api.weather.gov/points/43.7589,-71.6892`
- **OpenRouter image API** with `qwen/qwen-image-2.1-turbo` to do
  image-to-image (the reference photo `public/panther-snow.jpg` is passed via
  `input_references`, and a prompt describes the season, time of day, and
  weather to paint).

## Layout

```
server/index.ts   Express server (port 3000): /api/weather, /api/weather-image,
                  and serves the built frontend in production.
server/weather.ts NWS API client (current + forecast, time-of-day, season).
server/image.ts    OpenRouter image-to-image call + prompt builder.
src/              React frontend (Vite, port 5173 in dev).
public/           Reference image served by both Vite and Express.
```

## Running it

The OpenRouter API key lives in `openrouter.env` (sibling to this directory or
in this directory, already covered by `.gitignore`). Format:

```sh
export OPENROUTER_API_KEY=sk-or-v1-...
```

Dev mode (two servers, hot reload; Vite proxies `/api` to Express):

```sh
npm install
npm run dev
# open http://localhost:5173
```

Production mode (Express serves the built frontend):

```sh
npm run build
npm start
# open http://localhost:3000
```

Press **Transform to current weather** to repaint the scene. Each image
generation takes ~20 seconds and costs roughly $0.02.
