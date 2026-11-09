// NWS (National Weather Service) API client for Plymouth, NH.
// Free, no API key required. Coordinates: 43.7589 N, 71.6892 W.

const POINTS_URL = "https://api.weather.gov/points/43.7589,-71.6892";
const USER_AGENT = "cs2010-weather-app/1.0 (lab10; contact: student)";

async function nwsFetch(url: string): Promise<any> {
  const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!resp.ok) {
    throw new Error(`NWS HTTP ${resp.status} for ${url}`);
  }
  return resp.json();
}

export interface WeatherReport {
  location: {
    city: string;
    state: string;
    lat: number;
    lon: number;
  };
  now: {
    local: string;       // formatted local time
    timeOfDay: string;   // night / dawn / morning / afternoon / golden hour / dusk
    season: string;      // winter / spring / summer / fall
    date: string;        // human readable, e.g. "Mon, Nov 9"
    isDaytime: boolean;
  };
  current: {
    temperatureC: number;
    temperatureF: number;
    shortForecast: string;
    detailedForecast: string;
    humidity: number | null;
    windSpeed: string;
    windDirection: string;
    precipitationChance: number | null;
  };
  forecast: Array<{
    name: string;
    isDaytime: boolean;
    shortForecast: string;
    temperatureC: number | null;
    precipitationChance: number | null;
  }>;
}

function timeOfDay(hour: number, mins: number, sunriseH: number, sunriseM: number, sunsetH: number, sunsetM: number): string {
  const now = hour * 60 + mins;
  const rise = sunriseH * 60 + sunriseM;
  const set = sunsetH * 60 + sunsetM;

  if (now < rise) return "night";
  if (now < rise + 60) return "dawn";
  if (now < 12 * 60) return "morning";
  if (now < set - 60) return "afternoon";
  if (now < set) return "golden hour";
  if (now < set + 60) return "dusk";
  return "night";
}

function season(month: number): string {
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "fall";
}

export async function getWeather(): Promise<WeatherReport> {
  const points = await nwsFetch(POINTS_URL);
  const props = points.properties;
  const tz = props.timeZone as string;

  const astro = props.astronomicalData as {
    sunrise: string;
    sunset: string;
  };
  const sunrise = new Date(astro.sunrise);
  const sunset = new Date(astro.sunset);

  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const localParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(localParts.find((p) => p.type === "hour")?.value ?? "12");
  const minute = Number(localParts.find((p) => p.type === "minute")?.value ?? "0");

  const sunHour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "numeric", hour12: false,
  }).format(sunrise));
  const sunMin = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, minute: "2-digit", hour12: false,
  }).format(sunrise));
  const setHour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "numeric", hour12: false,
  }).format(sunset));
  const setMin = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, minute: "2-digit", hour12: false,
  }).format(sunset));

  // Hourly forecast: first period is "right now".
  const hourly = await nwsFetch(`${props.forecastHourly}?units=si`);
  const cur = hourly.properties.periods[0];

  // Daily forecast for a look-ahead summary.
  const daily = await nwsFetch(`${props.forecast}?units=si`);
  const periods = daily.properties.periods.slice(0, 6);

  const current: WeatherReport["current"] = {
    temperatureC: Math.round(cur.temperature),
    temperatureF: Math.round((cur.temperature * 9) / 5 + 32),
    shortForecast: cur.shortForecast,
    detailedForecast: cur.detailedForecast ?? "",
    humidity: cur.relativeHumidity?.value ?? null,
    windSpeed: cur.windSpeed,
    windDirection: cur.windDirection,
    precipitationChance: cur.probabilityOfPrecipitation?.value ?? null,
  };

  const forecast = periods.map((p: any) => ({
    name: p.name,
    isDaytime: p.isDaytime,
    shortForecast: p.shortForecast,
    temperatureC: p.temperatureUnit === "C" ? Math.round(p.temperature) : Math.round(((p.temperature - 32) * 5) / 9),
    precipitationChance: p.probabilityOfPrecipitation?.value ?? null,
  }));

  return {
    location: {
      city: props.relativeLocation.properties.city,
      state: props.relativeLocation.properties.state,
      lat: points.geometry.coordinates[1],
      lon: points.geometry.coordinates[0],
    },
    now: {
      local: fmt.format(now),
      timeOfDay: timeOfDay(hour, minute, sunHour, sunMin, setHour, setMin),
      season: season(now.getMonth() + 1),
      date: dateFmt.format(now),
      isDaytime: cur.isDaytime,
    },
    current,
    forecast,
  };
}
