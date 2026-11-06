import ModeIcon from '../components/ModeIcon.jsx'
import { Link } from 'react-router-dom'
import { Marker, Tooltip } from 'react-leaflet'
import { badgeIcon } from '../utils/mapIcons.js'
import MapCard, { MapCardIcon } from '../components/MapCard.jsx'
import BackButton from '../components/BackButton.jsx'
import { AIRPORTS, FLIGHTS_URL } from '../data/airports.js'
import { useWeather } from '../hooks/useWeather.js'
import { describeWeather } from '../utils/weather.js'
import WeatherIcon from '../components/WeatherIcon.jsx'
import LiveFlights from '../components/LiveFlights.jsx'
import ExternalTitle from '../components/ExternalTitle.jsx'
import GlyphBadge from '../components/GlyphBadge.jsx'
import { useApi } from '../hooks/useApi.js'
import { FLIGHT_GROUPS, airportTraffic } from '../utils/flights.js'
import './ModePage.css'
import './EcobiciPage.css'
import './AirportsPage.css'

// Mismo trazo que el icono de Aeropuertos.
const AIRPORT_ICON = 'M2 13l9-2 4-8h2l-2 9 6 1 1 2-7 1-3 6h-2l1-7-9-2z'

const COLOR = Object.fromEntries(FLIGHT_GROUPS.map((g) => [g.key, g.color]))

/** Aterrizando y despegando ahora en el aeropuerto, con el avion del color del mapa. */
function TrafficNow({ code }) {
  // Misma consulta que el mapa de abajo: se comparte la respuesta.
  const { data } = useApi('/api/v1/vuelos', { refreshMs: 30_000 })
  if (!data) return null
  const { arriving, departing } = airportTraffic(data.flights, code)
  if (arriving + departing === 0) {
    return <div className="airport-traffic airport-traffic-quiet">Sin aterrizajes ni despegues en este momento.</div>
  }
  return (
    <div className="airport-traffic">
      <span className="airport-traffic-label">Ahora</span>
      {arriving > 0 && (
        <span className="airport-traffic-item">
          <GlyphBadge glyph="plane" shape="circle" bg={COLOR.arriving} fg="#fff" size={20} rotate={135} />
          {arriving} aterrizando
        </span>
      )}
      {departing > 0 && (
        <span className="airport-traffic-item">
          <GlyphBadge glyph="plane" shape="circle" bg={COLOR.departing} fg="#17171a" size={20} rotate={45} />
          {departing} despegando
        </span>
      )}
    </div>
  )
}

/** Las lineas de colectivo que llegan al aeropuerto, cada una con su recorrido. */
function BusChips({ buses }) {
  return (
    <div className="airport-buses">
      {buses.map((bus) => (
        <Link
          key={bus}
          className="bus-chip"
          to={`/colectivos?linea=${encodeURIComponent(bus)}`}
          title={`Ver la línea ${bus}`}
        >
          {bus}
        </Link>
      ))}
    </div>
  )
}

function AirportCard({ airport }) {
  const { data: weather, error } = useWeather(airport.latitude, airport.longitude)
  const sky = weather ? describeWeather(weather.code, weather.isDay) : null

  return (
    <article className="airport-card">
      <header className="airport-head">
        <span className="airport-code">{airport.code}</span>
        <div>
          <h2 className="airport-name">{airport.name}</h2>
          <div className="airport-area">
            {airport.area} · {airport.kind}
          </div>
        </div>
      </header>

      <TrafficNow code={airport.code} />

      <div className="airport-weather" aria-live="polite">
        {weather && (
          <>
            <WeatherIcon kind={sky.icon} className="airport-weather-icon" />
            <span className="airport-temp">{Math.round(weather.temperature)}°C</span>
            <span className="airport-sky">
              {sky.label} · viento {Math.round(weather.wind)} km/h
            </span>
          </>
        )}
        {!weather && !error && <span className="airport-sky">Cargando clima...</span>}
        {!weather && error && <span className="airport-sky">Clima no disponible por el momento.</span>}
      </div>

      <div className="airport-section">
        <div className="airport-label">Cómo llegar en colectivo</div>
        <BusChips buses={airport.buses} />
        <ul className="airport-notes">
          {airport.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>

      <a className="airport-flights" href={FLIGHTS_URL} target="_blank" rel="noreferrer">
        <ExternalTitle text="Ver vuelos y estado en Aeropuertos Argentina" />
      </a>
    </article>
  )
}

/** Pagina de aeropuertos: clima actual, como llegar, aviones en vivo y enlace a vuelos. */
export default function AirportsPage() {
  return (
    <div className="wrap content">
      <BackButton />
      <h1 className="page-title page-title-icon">
        <ModeIcon mode="AEROPUERTO" size="lg" />
        Aeropuertos
      </h1>
      <p className="page-subtitle">Clima actual, cómo llegar en transporte público y los aviones en vivo.</p>

      <div className="airports-grid">
        {AIRPORTS.map((airport) => (
          <AirportCard key={airport.code} airport={airport} />
        ))}
      </div>

      <LiveFlights bounds={AIRPORTS.map((a) => [a.latitude, a.longitude])}>
        {AIRPORTS.map((airport) => (
          <Marker
            key={airport.code}
            position={[airport.latitude, airport.longitude]}
            title={airport.name}
            icon={badgeIcon('plane', { bg: '#f4c11b', fg: '#17171a', border: '#17171a', size: 30 })}
          >
            <Tooltip permanent direction="right" offset={[6, 0]} className="airport-map-label">
              <strong>{airport.code}</strong> {airport.name}
            </Tooltip>
            <MapCard
              badge={<MapCardIcon path={AIRPORT_ICON} />}
              kicker={airport.code}
              icon={<GlyphBadge glyph="plane" shape="circle" bg="#f4c11b" fg="#17171a" border="#17171a" />}
              title={airport.name}
              subtitle={`${airport.area} · ${airport.kind}`}
              actions={
                <a className="station-popup-link" href={FLIGHTS_URL} target="_blank" rel="noreferrer">
                  <ExternalTitle text="Ver vuelos" />
                </a>
              }
            >
              <div className="station-popup-section">
                <div className="station-popup-label">Colectivos</div>
                <BusChips buses={airport.buses} />
              </div>
            </MapCard>
          </Marker>
        ))}
      </LiveFlights>

      <p className="airports-source">
        Clima: Open-Meteo. Aviones: <a href="https://adsb.lol" target="_blank" rel="noreferrer">adsb.lol</a> (ODbL),
        con las señales que reciben antenas voluntarias (puede faltar alguno). Horarios, demoras y puertas: sitio
        oficial de Aeropuertos Argentina.
      </p>
    </div>
  )
}
