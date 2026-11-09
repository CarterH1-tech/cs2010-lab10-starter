// Shared types for the weather app. Mirrors the server's WeatherReport.
export interface WeatherReport {
  location: {
    city: string;
    state: string;
    lat: number;
    lon: number;
  };
  now: {
    local: string;
    timeOfDay: string;
    season: string;
    date: string;
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

export interface GeneratedImage {
  imageUrl: string;
  prompt: string;
  weather: WeatherReport;
}