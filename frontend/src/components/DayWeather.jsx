import { useMemo, useState } from 'react'
import PlaceIcon from './PlaceIcon.jsx'
import StationPicker from './StationPicker.jsx'
import WeatherIcon from './WeatherIcon.jsx'
import { useApi } from '../hooks/useApi.js'
import { useWeatherPlaces } from '../hooks/useWeatherPlaces.js'
import { useWeatherZone } from '../hooks/useWeatherZone.js'
import { headline, isRainy, nextHours } from '../utils/dayWeather.js'
import { distanceKm } from '../utils/map.js'
import { buildPlaces } from '../utils/places.js'
import { describeWeather } from '../utils/weather.js'
import { gridQuery } from '../utils/weatherPlaces.js'
import './DayWeather.css'

const REFRESH_MS = 15 * 60_000

const forecastPath = (place) => (place ? `/api/v1/clima/pronostico?${gridQuery(place)}` : null)

/** La tira de las proximas horas: una barra por hora con la probabilidad de lluvia. */
function RainStrip({ hours }) {
  const rainy = hours.filter(isRainy)
  const label = rainy.length
    ? `Lluvia probable a las ${rainy.map((h) => Number(h.time.slice(11, 13))).join(', ')} horas`
    : 'Sin lluvia en las próximas horas'
  return (
    <div className="dw-strip" role="img" aria-label={label}>
      {hours.map((h, i) => (
        <div key={h.time} className="dw-hour">
          <span className="dw-bar-box">
            <span
              className={`dw-bar${isRainy(h) ? ' dw-bar-rain' : ''}`}
              style={{ height: `${Math.max(8, h.rainChance ?? 0)}%` }}
            />
          </span>
          <small>{i % 3 === 0 ? Number(h.time.slice(11, 13)) : ''}</small>
        </div>
      ))}
    </div>
  )
}

function WeatherRow({ place, forecast }) {
  const now = forecast.current
  const sky = describeWeather(now.code, now.isDay)
  const { max, min } = forecast.today ?? {}
  return (
    <div className="dw-row">
      <div className="dw-place">
        <PlaceIcon tipo={place.tipo} size="sm" />
        <div>
          <strong>{place.label}</strong>
          <small>{place.detail}</small>
        </div>
      </div>
      <div className="dw-now" title={sky.label}>
        <WeatherIcon kind={sky.icon} className="dw-icon" />
        <div>
          <span className="dw-temp">{Math.round(now.temperature)}°</span>
          {Number.isFinite(max) && Number.isFinite(min) && (
            <small>
              {Math.round(max)}° / {Math.round(min)}°
            </small>
          )}
        </div>
      </div>
      <RainStrip hours={nextHours(forecast)} />
    </div>
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
 * zona que elijas; si no, Capital) y una frase con lo que importa para
 * viajar. Si el pronostico no esta disponible, no se muestra.
 */
export default function DayWeather() {
  const { places, ready, zone } = useWeatherPlaces()
  const [picking, setPicking] = useState(false)
  const first = useApi(ready ? forecastPath(places[0]) : null, { refreshMs: REFRESH_MS })
  const second = useApi(ready ? forecastPath(places[1]) : null, { refreshMs: REFRESH_MS })

  const usable = (data) => Boolean(data?.current && Array.isArray(data.hours))
  if (!ready || first.error || !usable(first.data)) return null
  const entries = [
    { place: places[0], forecast: first.data },
    ...(places[1] && usable(second.data) ? [{ place: places[1], forecast: second.data }] : []),
  ]
  const head = headline(entries)
  const primary = places[0]

  return (
    <section className="day-weather" aria-labelledby="dw-title">
      <div className="dw-top">
        <h2 id="dw-title" className="dw-title">
          Tu día
        </h2>
        {primary.id !== 'casa' && !picking && (
          <button type="button" className="dw-link" onClick={() => setPicking(true)}>
            {primary.isDefault ? 'Elegí tu zona' : 'Cambiar zona'}
          </button>
        )}
      </div>
      {head && <p className={`dw-headline dw-tone-${head.tone}`}>{head.text}</p>}
      {picking ? (
        <ZonePicker hasZone={Boolean(zone)} onDone={() => setPicking(false)} />
      ) : (
        entries.map((e) => <WeatherRow key={e.place.id} place={e.place} forecast={e.forecast} />)
      )}
    </section>
  )
}
