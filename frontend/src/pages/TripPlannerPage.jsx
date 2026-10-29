import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LineBadge from '../components/LineBadge.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import Skeleton from '../components/Skeleton.jsx'
import StationPicker from '../components/StationPicker.jsx'
import { useApi } from '../hooks/useApi.js'
import { buildPlaces } from '../utils/places.js'
import { googleMapsUrl, planTrip } from '../utils/planner.js'
import { formatDuration } from '../utils/travelTime.js'
import './ModePage.css'
import './AirportsPage.css'
import './TripPlannerPage.css'
import { stationPath } from '../utils/lineSlug.js'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)
  const [accessibleOnly, setAccessibleOnly] = useState(searchParams.get('accesible') === '1')
  const [fromAddress, setFromAddress] = useState('')
  const [toAddress, setToAddress] = useState('')
  // Aviso propio (no el globo del navegador) si falta el destino.
  const [missingTo, setMissingTo] = useState(false)
  const toAddressRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const restored = useRef(false)

  // Un lugar por estacion: Retiro aparece una vez aunque tenga cinco
  // lineas, y el viaje sale o llega por la que mas convenga.
  const options = useMemo(() => buildPlaces(stations), [stations])

  // Un enlace compartido (?desde=...&hasta=...) carga el viaje al abrirlo.
  useEffect(() => {
    if (restored.current || options.length === 0) return
    restored.current = true
    const find = (key) => options.find((p) => p.stationId === key) ?? null
    setOrigin(find(searchParams.get('desde')))
    setDestination(find(searchParams.get('hasta')))
  }, [options, searchParams])

  // Y al revés: el viaje elegido queda en la URL, listo para compartir.
  useEffect(() => {
    if (!restored.current) return
    const params = {}
    if (origin) params.desde = origin.stationId
    if (destination) params.hasta = destination.stationId
    if (accessibleOnly) params.accesible = '1'
    setSearchParams(params, { replace: true })
  }, [origin, destination, accessibleOnly, setSearchParams])

  const sameStation = origin && destination && origin.stationId === destination.stationId
  const result = useMemo(
    () => (origin && destination && !sameStation ? planTrip(stations, origin, destination, { accessibleOnly }) : null),
    [stations, origin, destination, sameStation, accessibleOnly],
  )
  const plan = result?.legs ? result : null

  async function share() {
    const url = window.location.href
    const title = `Cómo llegar de ${origin.stationName} a ${destination.stationName}`
    try {
      if (window.navigator.share) {
        await window.navigator.share({ title, url })
        return
      }
      await window.navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // El usuario cerro el menu o no hay permiso para copiar.
    }
  }

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

          <label className="planner-accessible">
            <input type="checkbox" checked={accessibleOnly} onChange={(e) => setAccessibleOnly(e.target.checked)} />
            <span>
              Solo estaciones accesibles <small>(con ascensor o rampa; hoy hay datos del subte)</small>
            </span>
          </label>

          {sameStation && <p className="planner-empty">Elegí dos estaciones distintas.</p>}
          {result?.inaccessible && (
            <p className="planner-empty">
              {result.inaccessible === 'origin' ? 'La estación de origen' : 'La estación de destino'} no figura como
              accesible. Elegí otra o desactivá la opción.
            </p>
          )}
          {origin && destination && !sameStation && !result && (
            <p className="planner-empty">
              No encontramos un viaje entre esas estaciones
              {accessibleOnly ? ' combinando solo en estaciones accesibles' : ''}.
            </p>
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
                <Link to={stationPath(plan.legs[plan.legs.length - 1].to)}>Ver la estación de destino</Link>
              </p>
              <button type="button" className="share-button planner-share" onClick={share}>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
                </svg>
                {copied ? 'Enlace copiado' : 'Compartir viaje'}
              </button>
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
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (!toAddress.trim()) {
              setMissingTo(true)
              toAddressRef.current?.focus()
              return
            }
            window.open(googleMapsUrl(fromAddress.trim() || 'Mi ubicación', toAddress.trim()), '_blank', 'noopener')
          }}
        >
          <input
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            placeholder="Desde (vacío = tu ubicación)"
            aria-label="Dirección de origen"
          />
          <div className="planner-address-field">
            <input
              ref={toAddressRef}
              value={toAddress}
              onChange={(e) => {
                setToAddress(e.target.value)
                if (e.target.value.trim()) setMissingTo(false)
              }}
              placeholder="Hasta, por ejemplo Av. Corrientes 1500"
              aria-label="Dirección de destino"
              aria-invalid={missingTo || undefined}
              aria-describedby={missingTo ? 'planner-address-error' : undefined}
            />
            {missingTo && (
              <p className="planner-address-error" id="planner-address-error" role="alert">
                Escribí a dónde vas, por ejemplo Av. Corrientes 1500.
              </p>
            )}
          </div>
          <button type="submit">Abrir en Google Maps ↗</button>
        </form>
      </section>
    </div>
  )
}
