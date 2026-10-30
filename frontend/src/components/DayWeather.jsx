import { useMemo, useState } from 'react'
import PlaceIcon from './PlaceIcon.jsx'
import StationPicker from './StationPicker.jsx'
import WeatherIcon from './WeatherIcon.jsx'
import { useApi } from '../hooks/useApi.js'
import { useWeatherPlaces } from '../hooks/useWeatherPlaces.js'
import { useWeatherZone } from '../hooks/useWeatherZone.js'
import { headline, hourSlots, isRainy, sunText, uvText } from '../utils/dayWeather.js'
import { distanceKm } from '../utils/map.js'
import { buildPlaces } from '../utils/places.js'
import { describeWeather } from '../utils/weather.js'
import { gridQuery } from '../utils/weatherPlaces.js'
import './DayWeather.css'

const REFRESH_MS = 15 * 60_000

const forecastPath = (place) => (place ? `/api/v1/clima/pronostico?${gridQuery(place)}` : null)

/** Iconos de la frase y de los datos (trazos de 24x24, como los del sitio). */
const TONE_ICONS = {
  rain: 'M3 12a9 9 0 0 1 18 0zM12 12v7a2 2 0 0 1-4 0M12 3v1',
  storm: 'M3 12a9 9 0 0 1 18 0zM12 12v7a2 2 0 0 1-4 0M12 3v1',
  heat: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  cold: 'M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9',
  wind: 'M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7',
  ok: 'M5 12.5l4 4 10-10',
}
const WIND = 'M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7'
const DROP = 'M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3z'
const SUN = 'M12 10V3M8 7l4 4 4-4M3 18h18M6 14a6 6 0 0 1 12 0'
const UV = 'M12 3v2M12 19v2M3 12h2M19 12h2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'

function Glyph({ d, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  )
}

function Chip({ d, children }) {
  return (
    <span className="dw-chip">
      <Glyph d={d} />
      {children}
    </span>
  )
}

/** El clima de un lugar: ahora, los proximos horarios y los datos utiles. */
function PlaceWeather({ forecast }) {
  const now = forecast.current
  const sky = describeWeather(now.code, now.isDay)
  const { max, min } = forecast.today ?? {}
  const sun = sunText(forecast)
  const uv = uvText(forecast)
  const details = [`Sensación ${Math.round(now.feelsLike)}°`]
  if (Number.isFinite(max) && Number.isFinite(min)) details.push(`Máx ${Math.round(max)}° · Mín ${Math.round(min)}°`)
  return (
    <>
      <div className="dw-hero">
        <WeatherIcon kind={sky.icon} className="dw-icon" />
        <div className="dw-temp">{Math.round(now.temperature)}°</div>
        <div className="dw-sky">
          <strong>{sky.label}</strong>
          <span>{details.join(' · ')}</span>
        </div>
      </div>
      <div className="dw-hours">
        {hourSlots(forecast).map((h) => {
          const slot = describeWeather(h.code, h.isDay)
          return (
            <div key={h.time} className="dw-hour" title={slot.label}>
              <small>{h.label}</small>
              <WeatherIcon kind={slot.icon} className="dw-hour-icon" />
              <strong>{Math.round(h.temperature)}°</strong>
              <span className={isRainy(h) ? 'dw-wet' : ''}>
                {h.rainChance != null ? `${h.rainChance}%` : isRainy(h) ? 'lluvia' : ''}
              </span>
            </div>
          )
        })}
      </div>
      <div className="dw-chips">
        <Chip d={WIND}>Viento {Math.round(now.wind)} km/h</Chip>
        {now.humidity != null && <Chip d={DROP}>Humedad {now.humidity}%</Chip>}
        {sun && <Chip d={SUN}>{sun}</Chip>}
        {uv && <Chip d={UV}>{uv}</Chip>}
      </div>
    </>
  )
}

/** Elegir la zona: la estacion mas cercana o la ubicacion del navegador (se guarda solo la zona). */
function ZonePicker({ hasZone, onDone }) {
  const { setZone } = useWeatherZone()
  const { data: stations } = useApi('/api/v1/map/stations')
  const options = useMemo(() => buildPlaces(stations), [stations])
  const [status, setStatus] = useState(null)

  function locate() {
    if (!window.navigator.geolocation) {
      setStatus('Este navegador no puede dar tu ubicación.')
      return
    }
    setStatus('Buscando tu ubicación…')
    window.navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        // El punto exacto no se guarda: se usa para el nombre (la estacion mas cercana) y la zona.
        const here = { latitude: coords.latitude, longitude: coords.longitude }
        const nearest = options.reduce(
          (best, p) => {
            const d = distanceKm(here, p)
            return d < best.d ? { p, d } : best
          },
          { p: null, d: Infinity },
        )
        const saved =
          nearest.p && setZone({ nombre: nearest.p.stationName, lat: coords.latitude, lon: coords.longitude })
        if (saved) onDone()
        else setStatus('Tu ubicación está fuera del AMBA: elegí una estación.')
      },
      () => setStatus('No se pudo obtener tu ubicación. Elegí una estación.'),
      { maximumAge: 10 * 60_000, timeout: 15_000 },
    )
  }

  return (
    <div className="dw-picker">
      <StationPicker
        id="dw-zone"
        title="La estación más cerca de tu casa"
        stations={options}
        value={null}
        onChange={(p) => {
          setZone({ nombre: p.stationName, lat: p.latitude, lon: p.longitude })
          onDone()
        }}
      />
      <div className="dw-picker-actions">
        <button type="button" className="dw-link" onClick={locate} disabled={!stations}>
          Usar mi ubicación
        </button>
        {hasZone && (
          <button
            type="button"
            className="dw-link"
            onClick={() => {
              setZone(null)
              onDone()
            }}
          >
            Volver a Capital
          </button>
        )}
        <button type="button" className="dw-link dw-link-muted" onClick={onDone}>
          Cancelar
        </button>
      </div>
      {status && <p className="dw-picker-status">{status}</p>}
      <p className="dw-picker-note">Se guarda solo la zona (unos 5 km), no tu ubicación exacta.</p>
    </div>
  )
}

/**
 * "Tu dia": el clima de tus lugares (Casa y Trabajo de Mis lugares, o la
 * zona que elijas; si no, Capital): ahora, los proximos horarios, datos
 * utiles y una frase con lo que importa para viajar (mira todos tus
 * lugares). De noche, con el cielo oscuro de fondo. Si el pronostico no esta
 * disponible, no se muestra.
 */
export default function DayWeather() {
  const { places, ready, zone } = useWeatherPlaces()
  const [picking, setPicking] = useState(false)
  const [selected, setSelected] = useState(0)
  const first = useApi(ready ? forecastPath(places[0]) : null, { refreshMs: REFRESH_MS })
  const second = useApi(ready ? forecastPath(places[1]) : null, { refreshMs: REFRESH_MS })

  const usable = (data) => Boolean(data?.current && Array.isArray(data.hours))
  if (!ready || first.error || !usable(first.data)) return null
  const entries = [
    { place: places[0], forecast: first.data },
    ...(places[1] && usable(second.data) ? [{ place: places[1], forecast: second.data }] : []),
  ]
  const head = headline(entries)
  const shown = entries[Math.min(selected, entries.length - 1)]
  const night = shown.forecast.current.isDay === false
  const primary = places[0]

  return (
    <section className={`day-weather${night ? ' dw-night' : ''}`} aria-labelledby="dw-title">
      <h2 id="dw-title" className="visually-hidden">
        Tu día
      </h2>
      <div className="dw-top">
        {entries.length > 1 ? (
          <div className="dw-switch" role="group" aria-label="Lugar">
            {entries.map((e, i) => (
              <button
                key={e.place.id}
                type="button"
                className={e === shown ? 'on' : ''}
                aria-pressed={e === shown}
                onClick={() => setSelected(i)}
              >
                <PlaceIcon tipo={e.place.tipo} size="sm" />
                {e.place.label} · {Math.round(e.forecast.current.temperature)}°
              </button>
            ))}
          </div>
        ) : (
          <div className="dw-place">
            <PlaceIcon tipo={shown.place.tipo} size="sm" />
            <strong>{shown.place.label}</strong>
            <span>{shown.place.detail}</span>
          </div>
        )}
        {primary.id !== 'casa' && !picking && (
          <button type="button" className="dw-link" onClick={() => setPicking(true)}>
            {primary.isDefault ? 'Elegí tu zona' : 'Cambiar zona'}
          </button>
        )}
      </div>
      {head && (
        <p className={`dw-headline dw-tone-${head.tone}`}>
          <Glyph d={TONE_ICONS[head.tone] ?? TONE_ICONS.ok} className="dw-tone-icon" />
          {head.text}
        </p>
      )}
      {picking ? (
        <ZonePicker hasZone={Boolean(zone)} onDone={() => setPicking(false)} />
      ) : (
        <PlaceWeather forecast={shown.forecast} />
      )}
    </section>
  )
}
