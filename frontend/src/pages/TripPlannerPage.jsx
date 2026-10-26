import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LineBadge from '../components/LineBadge.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import Skeleton from '../components/Skeleton.jsx'
import StationPicker from '../components/StationPicker.jsx'
import { useApi } from '../hooks/useApi.js'
import { googleMapsUrl, planTrip } from '../utils/planner.js'
import { formatDuration } from '../utils/travelTime.js'
import './ModePage.css'
import './AirportsPage.css'
import './TripPlannerPage.css'

const asLine = (s) => ({ mode: s.lineMode, code: s.lineCode, name: s.lineName, colorHex: s.lineColorHex })

function Leg({ leg }) {
  if (leg.type === 'ride') {
    return (
      <li className="planner-leg" style={{ '--line-color': leg.from.lineColorHex }}>
        <LineBadge line={asLine(leg.from)} size="sm" />
        <div>
          <strong>
            Tomá la {leg.from.lineName} en {leg.from.stationName}
          </strong>
          <span>
            Hacia {leg.towards.stationName}. Bajá en <strong>{leg.to.stationName}</strong> ({leg.stops}{' '}
            {leg.stops === 1 ? 'estación' : 'estaciones'}, ≈ {formatDuration(leg.minutes)})
          </span>
        </div>
      </li>
    )
  }
  if (leg.type === 'walk') {
    return (
      <li className="planner-leg planner-walk">
        <span className="planner-walk-icon" aria-hidden="true">🚶</span>
        <div>
          <strong>Combiná caminando a {leg.to.stationName}</strong>
          <span>
            {leg.to.lineName} · unos {leg.meters} m · ≈ {formatDuration(leg.minutes)} con la espera
          </span>
        </div>
      </li>
    )
  }
  return (
    <li className="planner-leg planner-walk">
      <span className="planner-walk-icon" aria-hidden="true">↔</span>
      <div>
        <strong>Cambiá de ramal en {leg.to.stationName}</strong>
        <span>Esperá el tren hacia el otro ramal (≈ {formatDuration(leg.minutes)}).</span>
      </div>
    </li>
  )
}

/**
 * Como llegar: viaje entre dos estaciones de subte, Premetro y tren, con
 * combinaciones y tiempo estimado. Para direcciones o colectivos, abre
 * Google Maps en modo transporte publico.
 */
export default function TripPlannerPage() {
  const { data: stations, loading, error } = useApi('/api/v1/map/stations')
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)
  const [fromAddress, setFromAddress] = useState('')
  const [toAddress, setToAddress] = useState('')

  // Una opcion por estacion y linea (en el Mitre la misma estacion esta en varios ramales).
  const options = useMemo(() => {
    const seen = new Set()
    return (stations ?? []).filter((s) => {
      const key = `${s.lineId}|${s.stationName}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [stations])

  const sameStation =
    origin && destination && origin.lineId === destination.lineId && origin.stationName === destination.stationName
  const plan = useMemo(
    () => (origin && destination && !sameStation ? planTrip(stations, origin, destination) : null),
    [stations, origin, destination, sameStation],
  )

  function swap() {
    setOrigin(destination)
    setDestination(origin)
  }

  return (
    <div className="wrap content">
      <BackButton />
      <h1 className="page-title page-title-icon">
        <ModeIcon mode="COMO_LLEGAR" size="lg" />
        Cómo llegar
      </h1>
      <p className="page-subtitle">Armá tu viaje en subte, Premetro y tren, con combinaciones y tiempo estimado.</p>

      {loading && <Skeleton variant="block" label="Cargando estaciones…" />}
      {error && <ErrorMessage what="las estaciones" error={error} />}

      {stations && (
        <section className="planner-card">
          <div className="planner-form">
            <StationPicker id="origen" title="Desde" stations={options} value={origin} onChange={setOrigin} />
            <button type="button" className="planner-swap" onClick={swap} aria-label="Invertir origen y destino">
              ⇅
            </button>
            <StationPicker
              id="destino"
              title="Hasta"
              stations={options}
              value={destination}
              onChange={setDestination}
            />
          </div>

          {sameStation && <p className="planner-empty">Elegí dos estaciones distintas.</p>}
          {origin && destination && !sameStation && !plan && (
            <p className="planner-empty">No encontramos un viaje entre esas estaciones.</p>
          )}

          {plan && (
            <div className="planner-result">
              <div className="planner-summary">
                <strong>≈ {formatDuration(plan.minutes)}</strong>
                <span>
                  {plan.transfers === 0
                    ? 'Sin combinaciones'
                    : `${plan.transfers} ${plan.transfers === 1 ? 'combinación' : 'combinaciones'}`}
                </span>
              </div>
              <ol className="planner-legs">
                {plan.legs.map((leg, i) => (
                  <Leg key={i} leg={leg} />
                ))}
              </ol>
              <p className="planner-note">
                Tiempo estimado por distancia, más unos minutos de espera en cada combinación. No incluye la espera
                inicial.{' '}
                <Link to={`/estaciones/${destination.stationId}`}>Ver la estación de destino</Link>
              </p>
              <a className="planner-maps" href={googleMapsUrl(origin, destination)} target="_blank" rel="noreferrer">
                Ver este viaje en Google Maps ↗
              </a>
            </div>
          )}
        </section>
      )}

      <section className="planner-card">
        <h2 className="planner-heading">¿Vas a una dirección?</h2>
        <p className="planner-dim">
          Para viajes de puerta a puerta (con colectivos o caminando) te llevamos a Google Maps con el recorrido en
          transporte público.
        </p>
        <form
          className="planner-address"
          onSubmit={(event) => {
            event.preventDefault()
            if (toAddress.trim()) window.open(googleMapsUrl(fromAddress.trim() || 'Mi ubicación', toAddress.trim()), '_blank', 'noopener')
          }}
        >
          <input
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            placeholder="Desde (vacío = tu ubicación)"
            aria-label="Dirección de origen"
          />
          <input
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="Hasta, por ejemplo Av. Corrientes 1500"
            aria-label="Dirección de destino"
            required
          />
          <button type="submit">Abrir en Google Maps ↗</button>
        </form>
      </section>
    </div>
  )
}
