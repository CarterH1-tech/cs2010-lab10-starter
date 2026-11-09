import { useEffect, useState } from 'react'
import './App.css'
import type { GeneratedImage, WeatherReport } from './types.ts'

function App() {
  const [weather, setWeather] = useState<WeatherReport | null>(null)
  const [generated, setGenerated] = useState<GeneratedImage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/weather')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setWeather(data)
      })
      .catch((err: unknown) => setError(`Couldn't fetch weather: ${errMessage(err)}`))
  }, [])

  async function transformImage() {
    setLoading(true)
    setError(null)
    setGenerated(null)
    try {
      const resp = await fetch('/api/weather-image', { method: 'POST' })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error ?? `HTTP ${resp.status}`)
      setGenerated(data)
    } catch (err) {
      setError(`Image generation failed: ${errMessage(err)}`)
    } finally {
      setLoading(false)
    }
  }

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

  const w = weather

  return (
    <div className="page">
      <header className="header">
        <h1>🌤️ Weather Portrait</h1>
        <p className="subtitle">
          A reference photo of {w?.location.city ?? 'Plymouth'}, NH, repainted to match
          the current season, time of day, and forecast.
        </p>
      </header>

      <main>
        {error && <div className="error">⚠️ {error}</div>}

        {!w && !error && <div className="muted">Loading weather…</div>}

        {w && (
          <section className="weather-card">
            <div className="weather-main">
              <div className="temp">
                <span className="temp-num">{w.current.temperatureF}°</span>
                <span className="temp-unit">F / {w.current.temperatureC}°C</span>
              </div>
              <div>
                <div className="condition">{w.current.shortForecast}</div>
                <div className="meta">
                  {w.location.city}, {w.location.state} · {w.now.date} {w.now.local}
                </div>
              </div>
            </div>

            <div className="badges">
              <span className="badge">🕐 {w.now.timeOfDay}</span>
              <span className="badge">🍂 {w.now.season}</span>
              <span className="badge">💨 {w.current.windSpeed} {w.current.windDirection}</span>
              {w.current.humidity != null && <span className="badge">💧 {w.current.humidity}%</span>}
              {w.current.precipitationChance != null && (
                <span className="badge">🌧️ {w.current.precipitationChance}%</span>
              )}
            </div>

            {w.current.detailedForecast && (
              <p className="detail">{w.current.detailedForecast}</p>
            )}
          </section>
        )}

        <section className="images">
          <figure className="frame">
            <img src="panther-snow.jpg" alt="Reference photo of Plymouth in snow" />
            <figcaption>Reference: winter scene</figcaption>
          </figure>

          <figure className="frame">
            {loading ? (
              <div className="spinner-box">
                <div className="spinner"></div>
                <p>Painting the forecast… (usually ~20s)</p>
              </div>
            ) : generated ? (
              <img src={generated.imageUrl} alt="Weather-matched scene" />
            ) : (
              <div className="empty">Click “Transform” to repaint the scene.</div>
            )}
            <figcaption>
              {generated
                ? `${generatedCaption(generated)}`
                : 'Generated: current weather'}
            </figcaption>
          </figure>
        </section>

        <div className="controls">
          <button onClick={transformImage} disabled={loading || !w} className="transform-btn">
            {loading ? '…working…' : '🎨 Transform to current weather'}
          </button>
        </div>

        {generated && (
          <details className="prompt">
            <summary>Watch the prompt that drove this image</summary>
            <pre>{generated.prompt}</pre>
          </details>
        )}

        {w && (
          <section className="forecast">
            <h2>Forecast ahead</h2>
            <ul>
              {w.forecast.map((p) => (
                <li key={p.name}>
                  <strong>{p.name}</strong> — {p.shortForecast}
                  {p.temperatureC != null && ` · ${p.temperatureC}°C`}
                  {p.precipitationChance != null && ` · ${p.precipitationChance}% rain`}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}

// Tiny helper so the leading "Generated:" caption echoes the weather used.
function generatedCaption(g: GeneratedImage): string {
  const c = g.weather.current
  return `Generated: ${c.shortForecast}, ${c.temperatureF}°F — ${g.weather.now.timeOfDay}, ${g.weather.now.season}`
}

export default App