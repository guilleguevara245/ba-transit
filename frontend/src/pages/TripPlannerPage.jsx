import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import Chevrons from '../components/Chevrons.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import ExternalTitle from '../components/ExternalTitle.jsx'
import LineBadge from '../components/LineBadge.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import PlaceIcon from '../components/PlaceIcon.jsx'
import Skeleton from '../components/Skeleton.jsx'
import StationPicker from '../components/StationPicker.jsx'
import TripIcon from '../components/TripIcon.jsx'
import { useApi } from '../hooks/useApi.js'
import { useClockPrefs } from '../hooks/useClockPrefs.js'
import { useNow } from '../hooks/useNow.js'
import { useSavedPlaces } from '../hooks/useSavedPlaces.js'
import { distanceText, isSavedAddress } from '../utils/addressSearch.js'
import { formatClock, formatClock12 } from '../utils/format.js'
import { buildPlaces } from '../utils/places.js'
import { findStationPlace, placePhrase } from '../utils/placesStore.js'
import { MAX_ACCESS_KM, googleMapsUrl, isAddress, planTrip, walkingAlternative } from '../utils/planner.js'
import { formatDuration } from '../utils/travelTime.js'
import { tripStrip, tripTimeline } from '../utils/tripTimeline.js'
import './ModePage.css'
import './AirportsPage.css'
import './TripPlannerPage.css'
import { stationPath } from '../utils/lineSlug.js'

/** La estacion de un lugar guardado: la suya o, si es una direccion confirmada, la mas cercana. */
const stationOf = (place) => place.estacion ?? place.cerca ?? null

/** Un lugar guardado como punto para Google Maps: la estacion (lat,lng) o la direccion. */
function mapsPoint(place, options) {
  if (place.direccion) return `${place.direccion}, Buenos Aires`
  return findStationPlace(options, place.estacion)
}

/**
 * Atajos entre Casa y Trabajo (y al reves). Con estaciones (las guardadas o
 * las mas cercanas a las direcciones confirmadas) el viaje se arma aca; si
 * no, abren Google Maps.
 */
function CommuteShortcuts({ places, options, onTrip }) {
  const home = places.find((p) => p.tipo === 'casa')
  const work = places.find((p) => p.tipo === 'trabajo')
  if (!home || !work) {
    return (
      <Link className="planner-places-link chevrons-host" to="/mis-lugares">
        {places.length > 0 ? 'Completá Casa y Trabajo en Mis lugares' : 'Guardá Casa y Trabajo y armá el viaje con un toque'}{' '}
        <Chevrons />
      </Link>
    )
  }
  const trips = [
    [home, work],
    [work, home],
  ]
  return (
    <div className="planner-shortcuts">
      {trips.map(([from, to]) => {
        const label = `${placePhrase(from, 'de')} ${placePhrase(to, 'a')}`
        // Con estacion (la propia o la mas cercana a la direccion), el viaje lo arma BA Transit.
        const fromStation = findStationPlace(options, stationOf(from))
        const toStation = findStationPlace(options, stationOf(to))
        if (fromStation && toStation && fromStation.stationId !== toStation.stationId) {
          return (
            <button
              key={label}
              type="button"
              className="planner-shortcut chevrons-host"
              onClick={() => onTrip(fromStation, toStation)}
            >
              <PlaceIcon tipo={from.tipo} size="sm" />
              <Chevrons />
              <PlaceIcon tipo={to.tipo} size="sm" />
              <span>{label}</span>
              {(from.cerca || to.cerca) && !(from.estacion && to.estacion) && (
                <small>desde la estación más cercana</small>
              )}
            </button>
          )
        }
        const a = mapsPoint(from, options)
        const b = mapsPoint(to, options)
        if (!a || !b) return null
        const content = (
          <>
            <PlaceIcon tipo={from.tipo} size="sm" />
            <Chevrons />
            <PlaceIcon tipo={to.tipo} size="sm" />
            <span>{label}</span>
            {(from.direccion || to.direccion) && <small>Google Maps ↗</small>}
          </>
        )
        if (from.direccion || to.direccion) {
          return (
            <a key={label} className="planner-shortcut chevrons-host" href={googleMapsUrl(a, b)} target="_blank" rel="noreferrer">
              {content}
            </a>
          )
        }
        return (
          <button key={label} type="button" className="planner-shortcut chevrons-host" onClick={() => onTrip(a, b)}>
            {content}
          </button>
        )
      })}
    </div>
  )
}

const asLine = (s) => ({ mode: s.lineMode, code: s.lineCode, name: s.lineName, colorHex: s.lineColorHex })

/** Clave de un punto elegido, para saber si origen y destino son el mismo. */
const pointKey = (p) => (isAddress(p) ? `direccion:${p.lat},${p.lon}` : p.stationId)
/** Como se nombra un punto elegido en textos ("de Ituzaingó a Medrano"). */
const pointName = (p) => (isAddress(p) ? p.text : p.stationName)

/** "14:32" o "2:32 p. m.", como el reloj del header. */
function clockText(date, formato) {
  if (formato !== '12') return formatClock(date)
  const { time, suffix } = formatClock12(date)
  return `${time} ${suffix}`
}

/** La linea de la parada: como llega y como sigue (color de la linea, a pie o esperando). */
function railClass(stop) {
  const part = (side, track) => {
    if (!track) return `no-${side}`
    if (track === 'walk') return `${side}-walk`
    if (track === 'wait') return `${side}-wait`
    return null
  }
  return ['planner-rail', part('in', stop.in), part('out', stop.out)].filter(Boolean).join(' ')
}

const trackColor = (track) => (track && track !== 'walk' && track !== 'wait' ? track : undefined)

/**
 * El viaje como linea de tiempo: cada parada con su hora estimada (si se
 * sale ahora) y, entre paradas, el tramo con el color de su linea o
 * punteado si es a pie.
 */
function Timeline({ legs, start, formato }) {
  const items = tripTimeline(legs)
  return (
    <ol className="planner-timeline">
      {items.map((item, i) => {
        if (item.type === 'segment') {
          return (
            <li
              key={i}
              className={`planner-seg planner-seg-${item.track === 'walk' || item.track === 'wait' ? item.track : 'ride'}`}
              style={{ '--track': trackColor(item.track) ?? item.line?.lineColorHex }}
            >
              <span className="planner-time" />
              <span className="planner-track" aria-hidden="true" />
              <p className="planner-seg-text">
                {item.line ? (
                  <LineBadge line={asLine(item.line)} size="sm" />
                ) : (
                  <TripIcon name={item.track === 'wait' ? 'wait' : 'walk'} />
                )}
                <span>{item.text}</span>
              </p>
            </li>
          )
        }
        const at = new Date(start.getTime() + item.at * 60_000)
        return (
          <li
            key={i}
            className={`planner-stop planner-stop-${item.kind}${item.address ? ' planner-stop-address' : ''}`}
            style={{ '--node': item.color ?? undefined, '--in': trackColor(item.in), '--out': trackColor(item.out) }}
          >
            <time className="planner-time" dateTime={at.toISOString()}>
              {clockText(at, formato)}
            </time>
            <span className={railClass(item)} aria-hidden="true">
              <span className="planner-node" />
            </span>
            <div className="planner-stop-text">
              <strong>{item.name}</strong>
              {item.text && <span>{item.text}</span>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Arriba del resultado: a pie y cada linea en orden (Sarmiento ››› H ››› B). */
function Strip({ legs }) {
  const parts = tripStrip(legs)
  return (
    <p className="planner-strip" aria-hidden="true">
      {parts.map((part, i) => (
        <span key={i} className="planner-strip-part">
          {i > 0 && <Chevrons />}
          {part.kind === 'line' ? <LineBadge line={asLine(part.station)} size="sm" /> : <TripIcon name="walk" />}
        </span>
      ))}
    </p>
  )
}

/** Aviso dentro de la tarjeta: lo que falta o lo que conviene (por ejemplo, ir caminando). */
function Notice({ tone = 'info', children }) {
  return (
    <div className={`planner-notice planner-notice-${tone}`} role="status">
      <TripIcon name={tone === 'walk' ? 'walk' : 'info'} />
      <div>{children}</div>
    </div>
  )
}

/**
 * Como llegar: viaje entre estaciones o direcciones en subte, Premetro y
 * tren, con combinaciones y tiempo estimado. Una direccion (Georef)
 * entra o sale de la red caminando hasta una estacion cercana; si no hay
 * ninguna, el viaje se ve en Google Maps.
 */
export default function TripPlannerPage() {
  const { data: stations, loading, error } = useApi('/api/v1/map/stations')
  const [searchParams, setSearchParams] = useSearchParams()
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)
  const [accessibleOnly, setAccessibleOnly] = useState(searchParams.get('accesible') === '1')
  const [copied, setCopied] = useState(false)
  const restored = useRef(false)
  const now = useNow(30_000)
  const { clock } = useClockPrefs()

  // Un lugar por estacion: Retiro aparece una vez aunque tenga cinco
  // lineas, y el viaje sale o llega por la que mas convenga.
  const options = useMemo(() => buildPlaces(stations), [stations])
  const { places } = useSavedPlaces()
  // Todos los lugares guardados (Casa, Trabajo, Club...) como chips de cada
  // campo: los guardados como estacion y los guardados como direccion
  // (que se buscan al tocarlos; si no, queda su estacion mas cercana).
  const placeChips = useMemo(
    () =>
      places
        .map((p, i) => ({
          key: `${p.tipo}-${i}`,
          tipo: p.tipo,
          nombre: p.nombre,
          option: findStationPlace(options, p.estacion ?? p.cerca),
          direccion: p.estacion ? null : p.direccion,
        }))
        .filter((c) => c.option || c.direccion),
    [places, options],
  )
  // El lugar ya elegido en un campo no se ofrece en el otro.
  const chipsBut = (chosen) =>
    placeChips.filter((c) => {
      if (!chosen) return true
      if (isAddress(chosen)) return !(c.direccion && isSavedAddress(chosen, c.direccion))
      return !(c.option && c.option.stationId === chosen.stationId)
    })

  // Un enlace compartido (?desde=...&hasta=...) carga el viaje al abrirlo.
  useEffect(() => {
    if (restored.current || options.length === 0) return
    restored.current = true
    const find = (key) => options.find((p) => p.stationId === key) ?? null
    setOrigin(find(searchParams.get('desde')))
    setDestination(find(searchParams.get('hasta')))
  }, [options, searchParams])

  // Y al revés: el viaje elegido queda en la URL, listo para compartir.
  // Las direcciones no van en la URL: quedan solo en esta pestaña.
  useEffect(() => {
    if (!restored.current) return
    const params = {}
    if (origin && !isAddress(origin)) params.desde = origin.stationId
    if (destination && !isAddress(destination)) params.hasta = destination.stationId
    if (accessibleOnly) params.accesible = '1'
    setSearchParams(params, { replace: true })
  }, [origin, destination, accessibleOnly, setSearchParams])

  const samePlace = origin && destination && pointKey(origin) === pointKey(destination)
  const result = useMemo(
    () => (origin && destination && !samePlace ? planTrip(stations, origin, destination, { accessibleOnly }) : null),
    [stations, origin, destination, samePlace, accessibleOnly],
  )
  const plan = result?.legs ? result : null
  const rides = plan ? plan.legs.filter((l) => l.type === 'ride') : []
  const walking = origin && destination && !samePlace ? walkingAlternative(origin, destination) : null
  // Caminando se llega antes (o el viaje no sube a ningun tren): se avisa.
  const walkIsBetter = walking && (!plan || rides.length === 0 || walking.minutes <= plan.minutes)
  const withAddress = isAddress(origin) || isAddress(destination)
  const mapsLink = origin && destination ? googleMapsUrl(origin, destination) : null

  // Para compartir, una direccion no viaja en el enlace: va de estacion a estacion.
  function shareUrl() {
    if (!withAddress) return window.location.href
    const placeOf = (station) => options.find((p) => p.stations.some((s) => s.stationId === station.stationId))
    const params = new URLSearchParams()
    params.set('desde', isAddress(origin) ? placeOf(rides[0].from).stationId : origin.stationId)
    params.set('hasta', isAddress(destination) ? placeOf(rides[rides.length - 1].to).stationId : destination.stationId)
    if (accessibleOnly) params.set('accesible', '1')
    return `${window.location.origin}${window.location.pathname}?${params}`
  }

  async function share() {
    const from = isAddress(origin) ? rides[0].from.stationName : origin.stationName
    const to = isAddress(destination) ? rides[rides.length - 1].to.stationName : destination.stationName
    const url = shareUrl()
    const title = `Cómo llegar de ${from} a ${to}`
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

  const lastRide = rides[rides.length - 1]
  const showPlan = plan && rides.length > 0

  return (
    <div className="wrap content">
      <BackButton />
      <h1 className="page-title page-title-icon">
        <ModeIcon mode="COMO_LLEGAR" size="lg" />
        Cómo llegar
      </h1>
      <p className="page-subtitle">
        Armá tu viaje en subte, Premetro y tren desde una estación o una dirección, con combinaciones y tiempo estimado.
      </p>

      {loading && <Skeleton variant="block" label="Cargando estaciones…" />}
      {error && <ErrorMessage what="las estaciones" error={error} />}

      {stations && (
        <section className="planner-card">
          <CommuteShortcuts
            places={places}
            options={options}
            onTrip={(from, to) => {
              setOrigin(from)
              setDestination(to)
            }}
          />
          <div className="planner-form">
            <StationPicker
              id="origen"
              title="Desde"
              stations={options}
              value={origin}
              onChange={setOrigin}
              shortcuts={chipsBut(destination)}
              withAddresses
            />
            <button type="button" className="planner-swap" onClick={swap} aria-label="Invertir origen y destino">
              <TripIcon name="swap" />
            </button>
            <StationPicker
              id="destino"
              title="Hasta"
              stations={options}
              value={destination}
              onChange={setDestination}
              shortcuts={chipsBut(origin)}
              withAddresses
            />
          </div>

          <label className="planner-accessible">
            <input type="checkbox" checked={accessibleOnly} onChange={(e) => setAccessibleOnly(e.target.checked)} />
            <span>
              Solo estaciones accesibles <small>(con ascensor o rampa; hoy hay datos del subte)</small>
            </span>
          </label>

          {samePlace && <Notice>Elegí dos lugares distintos: el origen y el destino son el mismo.</Notice>}
          {result?.far && (
            <Notice>
              No hay estaciones de tren, subte ni Premetro a menos de {MAX_ACCESS_KM} km de{' '}
              {pointName(result.far === 'origin' ? origin : destination)}. Para ese viaje conviene el colectivo.{' '}
              <a href={mapsLink} target="_blank" rel="noreferrer">
                <ExternalTitle text="Ver el viaje en Google Maps" />
              </a>
            </Notice>
          )}
          {result?.inaccessible && (
            <Notice>
              {isAddress(result.inaccessible === 'origin' ? origin : destination)
                ? `Cerca ${result.inaccessible === 'origin' ? 'del origen' : 'del destino'} no hay estaciones accesibles.`
                : `${result.inaccessible === 'origin' ? 'La estación de origen' : 'La estación de destino'} no figura como accesible.`}{' '}
              Elegí otro lugar o desactivá la opción.
            </Notice>
          )}
          {origin && destination && !samePlace && !result && (
            <Notice>
              No encontramos un viaje entre esos lugares
              {accessibleOnly ? ' combinando solo en estaciones accesibles' : ''}.
            </Notice>
          )}
          {walkIsBetter && (
            <Notice tone="walk">
              <strong>{showPlan ? 'Caminando llegás antes:' : 'Conviene ir caminando:'}</strong> están{' '}
              {distanceText(walking.km)}, unos {formatDuration(walking.minutes)} a pie.
            </Notice>
          )}

          {showPlan && (
            <div className="planner-result">
              <div className="planner-summary">
                <div>
                  <strong>≈ {formatDuration(plan.minutes)}</strong>
                  <span>
                    {plan.transfers === 0
                      ? 'Sin combinaciones'
                      : `${plan.transfers} ${plan.transfers === 1 ? 'combinación' : 'combinaciones'}`}{' '}
                    · si salís ahora, llegás ≈{' '}
                    {clockText(new Date(now.getTime() + plan.minutes * 60_000), clock.formato)}
                  </span>
                </div>
                <Strip legs={plan.legs} />
              </div>
              <Timeline legs={plan.legs} start={now} formato={clock.formato} />
              <p className="planner-note">
                Tiempo estimado por distancia, más unos minutos de espera en cada combinación. No incluye la espera
                inicial{withAddress ? ', y a pie se cuenta por calles, no en línea recta' : ''}.
              </p>
              <div className="planner-actions">
                <button type="button" className="share-button" onClick={share}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
                  </svg>
                  {copied ? 'Enlace copiado' : 'Compartir viaje'}
                </button>
                <Link className="planner-link chevrons-host" to={stationPath(lastRide.to)}>
                  {isAddress(destination) ? 'Ver la estación donde bajás' : 'Ver la estación de destino'} <Chevrons />
                </Link>
                <a className="planner-link" href={mapsLink} target="_blank" rel="noreferrer">
                  <ExternalTitle text={withAddress ? 'De puerta a puerta en Google Maps' : 'Ver en Google Maps'} />
                </a>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
