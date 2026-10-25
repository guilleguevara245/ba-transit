import ModeIcon from '../components/ModeIcon.jsx'
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import BackButton from '../components/BackButton.jsx'
import { AIRPORTS, FLIGHTS_URL } from '../data/airports.js'
import { useWeather } from '../hooks/useWeather.js'
import { describeWeather } from '../utils/weather.js'
import './ModePage.css'
import './AirportsPage.css'

function AirportCard({ airport }) {
  const { data: weather, error } = useWeather(airport.latitude, airport.longitude)
  const sky = weather ? describeWeather(weather.code) : null

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

      <div className="airport-weather" aria-live="polite">
        {weather && (
          <>
            <span className="airport-weather-icon" aria-hidden="true">
              {sky.icon}
            </span>
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
        <div className="airport-buses">
          {airport.buses.map((bus) => (
            <span className="bus-chip" key={bus}>
              {bus}
            </span>
          ))}
        </div>
        <ul className="airport-notes">
          {airport.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>

      <a className="airport-flights" href={FLIGHTS_URL} target="_blank" rel="noreferrer">
        Ver vuelos y estado en Aeropuertos Argentina ↗
      </a>
    </article>
  )
}

/** Pagina de aeropuertos: clima actual, como llegar y enlace a vuelos. */
export default function AirportsPage() {
  return (
    <div className="wrap content">
      <BackButton />
      <h1 className="page-title page-title-icon">
        <ModeIcon mode="AEROPUERTO" size="lg" />
        Aeropuertos
      </h1>
      <p className="page-subtitle">Clima actual y cómo llegar en transporte público.</p>

      <div className="airports-grid">
        {AIRPORTS.map((airport) => (
          <AirportCard key={airport.code} airport={airport} />
        ))}
      </div>

      <div className="section-label">Ubicación</div>
      <MapContainer className="airports-map" bounds={AIRPORTS.map((a) => [a.latitude, a.longitude])} boundsOptions={{ padding: [60, 60] }}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {AIRPORTS.map((airport) => (
          <CircleMarker
            key={airport.code}
            center={[airport.latitude, airport.longitude]}
            radius={10}
            pathOptions={{ color: '#17171a', fillColor: '#f4c11b', fillOpacity: 1, weight: 2 }}
          >
            <Tooltip permanent direction="right" offset={[10, 0]}>
              {airport.code} · {airport.name}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      <p className="airports-source">
        Clima: Open-Meteo. Los vuelos y demoras se consultan en el sitio oficial de Aeropuertos Argentina.
      </p>
    </div>
  )
}
