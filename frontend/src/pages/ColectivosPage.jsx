import LiveBusesMap from '../components/LiveBusesMap.jsx'
import UpdatedAt from '../components/UpdatedAt.jsx'
import MyBuses from '../components/MyBuses.jsx'
import Skeleton from '../components/Skeleton.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import BusRouteMap from '../components/BusRouteMap.jsx'
import BusAlerts from '../components/BusAlerts.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { useApi } from '../hooks/useApi.js'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { useDebounce } from '../hooks/useDebounce.js'
import { NARROW, useMediaQuery } from '../hooks/useMediaQuery.js'
import {
  busDescription,
  busFavoriteId,
  busParams,
  busTitle,
  headsignName,
  operatorName,
  stopFavoriteId,
  stopName,
} from '../utils/busNames.js'
import { formatDuration } from '../utils/travelTime.js'
import { stopTimes } from '../utils/busTrip.js'
import './ModePage.css'
import './ColectivosPage.css'
import './MapPage.css'

// Las posiciones se actualizan cada pocos segundos; el backend las guarda 20.
const LIVE_REFRESH_MS = 20_000

function BusNumber({ route, large = false }) {
  return (
    <span
      className={large ? 'bus-number large' : 'bus-number'}
      style={route.color ? { background: route.color } : undefined}
    >
      {route.shortName || '?'}
    </span>
  )
}

/** "303 a" -> "303A", para comparar carteles. */
const lineKey = (text) => String(text ?? '').replace(/\s+/g, '').toUpperCase()

/** Parametros extra por si el id del feed en vivo no esta en el GTFS del dia (ver ColectivoService.find). */
function detailPath(routeId, line, headsign) {
  const params = new URLSearchParams()
  if (line) params.set('numero', line)
  if (headsign) params.set('destino', headsign)
  const query = params.toString()
  return `/api/v1/colectivos/${encodeURIComponent(routeId)}${query ? `?${query}` : ''}`
}

function RouteDetail({ routeId, line, headsign, initialDirection, initialStop }) {
  const { data: route, loading, error } = useApi(detailPath(routeId, line, headsign))
  const [directionIndex, setDirectionIndex] = useState(0)
  // Parada elegida en la lista: { index, n } (n cambia en cada toque, para volver a centrarla).
  // Es donde subis: la lista cuenta los minutos desde ahi.
  const [focusedStop, setFocusedStop] = useState(null)
  // Donde bajas (indice de la parada), para ver el viaje entre las dos.
  const [alight, setAlight] = useState(null)
  const { ids: favoriteBuses } = useFavoriteList('colectivos')
  const { has: isSavedStop } = useFavoriteList('paradas')
  // Con el numero de la linea, el servidor descarta los colectivos de otra linea con el mismo id.
  const live = useApi(
    route
      ? `/api/v1/colectivos/${encodeURIComponent(routeId)}/vivo${route.shortName ? `?numero=${encodeURIComponent(route.shortName)}` : ''}`
      : null,
    { refreshMs: LIVE_REFRESH_MS },
  )

  // Si se llego tocando un colectivo del mapa en vivo, se abre el sentido
  // en el que iba ese colectivo (si no, el primero).
  useEffect(() => {
    const index = route?.directions.findIndex((d) => d.directionId === initialDirection) ?? -1
    setDirectionIndex(index >= 0 ? index : 0)
  }, [route, initialDirection])

  // Al cambiar de sentido, la parada elegida y la de bajada dejan de valer.
  useEffect(() => {
    setFocusedStop(null)
    setAlight(null)
  }, [directionIndex, route])

  // Los colectivos que vienen a la parada elegida, de esta linea y de las
  // otras que paran ahi (sus otros carteles y tus colectivos favoritos): los
  // de otras lineas se dibujan en el mapa, como en Tus favoritos.
  const shownDirection = route?.directions[directionIndex]
  const chosenStop = focusedStop && shownDirection ? shownDirection.stops[focusedStop.index] : null
  const arrivals = useApi(
    chosenStop
      ? `/api/v1/colectivos/${encodeURIComponent(route.id)}/parada/${encodeURIComponent(chosenStop.id)}` +
          `?sentido=${shownDirection.directionId}` +
          (favoriteBuses.length ? `&lineas=${encodeURIComponent(favoriteBuses.join(','))}` : '')
      : null,
    { refreshMs: LIVE_REFRESH_MS },
  )

  // Si se llego desde una parada favorita (&parada=), se marca esa parada una vez.
  const stopApplied = useRef(false)
  useEffect(() => {
    if (stopApplied.current || !route || !initialStop) return
    const direction = route.directions[directionIndex]
    if (initialDirection != null && direction?.directionId !== initialDirection) return
    const index = direction?.stops.findIndex((s) => s.id === initialStop) ?? -1
    if (index >= 0) {
      stopApplied.current = true
      setFocusedStop({ index, n: 1 })
    }
  }, [route, directionIndex, initialStop, initialDirection])

  if (loading) return <Skeleton variant="map" label="Cargando recorrido…" />
  if (String(error ?? '').includes('respondió 404')) {
    return (
      <div className="bus-unavailable">
        No encontramos el recorrido {line ? `de la línea ${line}` : 'de esta línea'} en los datos de hoy. Probá buscarla
        por número.
      </div>
    )
  }
  if (error) return <ErrorMessage what="el recorrido" error={error} />
  if (!route) return null

  const direction = route.directions[directionIndex]
  // Solo los colectivos del sentido elegido (el feed usa el mismo direction_id que el GTFS).
  const knownMinutes = (direction?.minutes ?? []).filter((m) => m != null)
  const totalMinutes = knownMinutes.length > 1 ? Math.max(...knownMinutes) : null
  const allVehicles = live.data?.vehicles ?? []
  // Si el feed en vivo usa sentidos que el GTFS no tiene (o la linea tiene
  // uno solo), se muestran todos en vez de decir que no hay ninguno.
  const knownDirections = new Set(route.directions.map((d) => d.directionId))
  const matchesGtfs = route.directions.length > 1 && allVehicles.some((v) => knownDirections.has(v.direction))
  const vehicles = matchesGtfs ? allVehicles.filter((v) => v.direction === direction.directionId) : allVehicles
  // Colectivos en vivo del otro sentido, para no decir "sin colectivos" si los hay.
  const otherIndex = matchesGtfs
    ? route.directions.findIndex(
        (d, index) => index !== directionIndex && allVehicles.some((v) => v.direction === d.directionId),
      )
    : -1
  const otherCount =
    otherIndex >= 0 ? allVehicles.filter((v) => v.direction === route.directions[otherIndex].directionId).length : 0
  // De otras lineas que vienen a la parada elegida (con posicion para el mapa).
  const ownLine = lineKey(route.shortName)
  const otherBuses = chosenStop
    ? (arrivals.data?.buses ?? []).filter((b) => b.line && lineKey(b.line) !== ownLine && b.latitude != null)
    : []
  const othersByLine = Object.entries(
    otherBuses.reduce((acc, b) => ({ ...acc, [b.line]: (acc[b.line] ?? 0) + 1 }), {}),
  )
  const chosenId = chosenStop ? stopFavoriteId(route.id, direction.directionId, chosenStop.id) : null
  const chosenLabel = chosenId && isSavedStop(chosenId) ? 'tu parada' : 'esta parada'
  const times = stopTimes(direction?.minutes ?? [], direction?.stops.length ?? 0, focusedStop?.index ?? null, alight)

  return (
    <section className="bus-detail">
      <header className="bus-detail-head">
        <BusNumber route={route} large />
        <div>
          <h2 className="bus-detail-name">{busTitle(route)}</h2>
          {busDescription(route) && <div className="bus-detail-agency">{busDescription(route)}</div>}
          {route.agency && <div className="bus-detail-agency">{operatorName(route.agency)}</div>}
        </div>
        {busFavoriteId(route.shortName) && (
          <FavoriteButton kind="colectivos" id={busFavoriteId(route.shortName)} name={busTitle(route)} />
        )}
      </header>

      <BusAlerts shortName={route.shortName} />

      {route.directions.length > 1 && (
        <div className="map-filters bus-directions" role="group" aria-label="Sentido">
          {route.directions.map((d, index) => (
            <button
              key={d.directionId}
              type="button"
              className={index === directionIndex ? 'map-filter active' : 'map-filter'}
              aria-pressed={index === directionIndex}
              onClick={() => setDirectionIndex(index)}
            >
              Hacia {headsignName(d.headsign) || `sentido ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      {live.data?.available && (
        <div className="bus-live" role="status">
          <span className="live-dot" aria-hidden="true" />
          {/* El texto en un solo bloque: en el celular sigue en el renglon de abajo en vez de partirse en columnas. */}
          <span className="bus-live-text">
            {vehicles.length > 0 &&
              `${vehicles.length} ${vehicles.length === 1 ? 'colectivo' : 'colectivos'} en vivo${matchesGtfs ? ' en este sentido' : ''}`}
            {vehicles.length === 0 && otherCount === 0 && `Sin colectivos en vivo de esta línea ahora${othersByLine.length ? '' : '.'}`}
            {vehicles.length > 0 && (route.id !== routeId || vehicles.some((v) => v.otherRoute)) && (
              <span className="bus-live-note"> · pueden ir por un ramal distinto del recorrido dibujado</span>
            )}
            {vehicles.length === 0 && otherCount > 0 && (
              <>
                Ninguno en este sentido ahora, pero hay {otherCount} en vivo{' '}
                <button type="button" className="bus-live-switch" onClick={() => setDirectionIndex(otherIndex)}>
                  hacia {headsignName(route.directions[otherIndex].headsign) || 'el otro sentido'}
                </button>
              </>
            )}
            {othersByLine.length > 0 && (
              <span className="bus-live-others">
                {' · '}
                {otherBuses.length === 1 ? 'viene ' : 'vienen '}
                {othersByLine.map(([sign, count], i) => (
                  <span key={sign}>
                    {i > 0 && (i === othersByLine.length - 1 ? ' y ' : ', ')}
                    {count} del <span className="bus-live-sign">{sign}</span>
                  </span>
                ))}{' '}
                a {chosenLabel}
              </span>
            )}
          </span>
          {live.data.updatedAt && (
            <UpdatedAt
              className="bus-live-updated"
              at={live.data.updatedAt}
              onRefresh={live.reload}
              refreshing={live.refreshing}
            />
          )}
        </div>
      )}

      <div className="bus-layout">
        <BusRouteMap
          className="bus-map"
          route={route}
          directionIndex={directionIndex}
          vehicles={vehicles}
          focusedStop={focusedStop}
          otherBuses={otherBuses}
        />
        {direction && (
          <div className="panel bus-stops">
            <div className="panel-title">
              Paradas
              <span className="count">{direction.stops.length}</span>
            </div>
            {totalMinutes != null && !times.trip && !chosenStop && (
              <div className="bus-total">
                Recorrido completo: <strong>{formatDuration(totalMinutes)}</strong>
                <span> según el horario del feed</span>
              </div>
            )}
            {/* De una parada a otra: lo que tarda el viaje entre donde subis y donde bajas. */}
            {times.trip && (
              <div className="bus-trip" role="status">
                <span>
                  {times.trip.from === 0 && !chosenStop ? 'Desde la cabecera' : `De ${stopName(direction.stops[times.trip.from].name)}`}{' '}
                  a {stopName(direction.stops[times.trip.to].name)}:{' '}
                  {times.trip.minutes != null && <strong>{formatDuration(times.trip.minutes)}</strong>}
                  {times.trip.minutes != null && ' · '}
                  {times.trip.stops} {times.trip.stops === 1 ? 'parada' : 'paradas'}
                </span>
                <button type="button" className="bus-trip-clear" onClick={() => setAlight(null)}>
                  Quitar bajada
                </button>
              </div>
            )}
            {/* Con una parada elegida, los minutos se cuentan desde ahi. */}
            {chosenStop && !times.trip && (
              <div className="bus-from">
                <span>
                  Minutos desde <strong>{stopName(chosenStop.name)}</strong>
                </span>
                <button type="button" className="bus-from-reset" onClick={() => setFocusedStop(null)}>
                  Desde la cabecera
                </button>
              </div>
            )}
            {/* El recorrido como una linea con sus paradas; la elegida queda marcada en la linea. */}
            <ol
              className={`bus-stop-list${focusedStop ? ' has-origin' : ''}`}
              style={route.color ? { '--bus-color': route.color } : undefined}
            >
              {direction.stops.map((stop, index) => {
                const active = focusedStop?.index === index
                const end = index === 0 || index === direction.stops.length - 1
                const { state, minutes } = times.rows[index] ?? { state: 'normal', minutes: null }
                const origin = focusedStop?.index ?? 0
                // Se puede bajar en cualquier parada despues de donde subis.
                const canAlight = index > origin
                const isAlight = alight === index
                const label =
                  state === 'from'
                    ? times.trip
                      ? 'subís'
                      : chosenLabel === 'tu parada'
                        ? 'tu parada'
                        : 'desde acá'
                    : minutes != null && (index > 0 || state !== 'normal')
                      ? `+${formatDuration(minutes)}`
                      : null
                return (
                  <li
                    key={`${stop.id}-${index}`}
                    className={['bus-stop', end && 'end', state !== 'normal' && `trip-${state}`].filter(Boolean).join(' ')}
                  >
                    {/* Tocar la parada la muestra en el mapa con su tarjeta y cuenta los minutos desde ahi. */}
                    <button
                      type="button"
                      className={`bus-stop-button${active ? ' active' : ''}`}
                      aria-current={active ? 'location' : undefined}
                      onClick={() => {
                        if (alight != null && index >= alight) setAlight(null)
                        setFocusedStop((prev) => ({ index, n: (prev?.n ?? 0) + 1 }))
                      }}
                    >
                      <span className="bus-stop-dot" aria-hidden="true" />
                      <span className="bus-stop-name">{stopName(stop.name)}</span>
                      {label && <span className="bus-stop-minutes">{label}</span>}
                    </button>
                    {/* Bajar aca: el viaje desde la parada elegida (o desde la cabecera) hasta esta. */}
                    {canAlight && (
                      <button
                        type="button"
                        className={`bus-stop-alight${isAlight ? ' active' : ''}`}
                        aria-pressed={isAlight}
                        onClick={() => setAlight(isAlight ? null : index)}
                      >
                        {isAlight ? 'Bajás acá' : 'Bajo acá'}
                      </button>
                    )}
                    {/* Guardar la parada: aparece al pasar el mouse, en la elegida o si ya esta guardada. */}
                    <span className="bus-stop-fav">
                      <FavoriteButton
                        kind="paradas"
                        id={stopFavoriteId(route.id, direction.directionId, stop.id)}
                        name={`la parada ${stopName(stop.name)} de la ${busTitle(route)}`}
                        compact
                      />
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Colectivos: buscar una linea por numero o nombre y ver su recorrido y
 * paradas. Datos: feed GTFS de colectivos (API Transporte).
 */
export default function ColectivosPage() {
  const narrow = useMediaQuery(NARROW)
  const [searchParams, setSearchParams] = useSearchParams()
  // La URL muestra el numero de la linea (?linea=53A) y el id del feed
  // (&id=283) para ubicarla sin ambiguedad. Con solo el numero (escrito a
  // mano o compartido) se busca la linea con ese cartel; los links viejos
  // traian el id en "linea" y siguen andando.
  const lineParam = searchParams.get('linea')
  const idParam = searchParams.get('id')
  const lookup = useApi(!idParam && lineParam ? `/api/v1/colectivos?q=${encodeURIComponent(lineParam)}` : null)
  const exact = lookup.data?.find((r) => (r.shortName ?? '').toUpperCase() === lineParam?.toUpperCase())
  const selectedId = idParam ?? (lineParam ? (exact?.id ?? (lookup.loading ? null : lineParam)) : null)
  const [query, setQuery] = useState('')
  // "Línea 53" o "linea 53" buscan lo mismo que "53".
  const debounced = useDebounce(query.trim().replace(/^l[ií]nea\s*/i, ''), 300)

  const status = useApi('/api/v1/colectivos/estado')
  const available = status.data?.available
  const results = useApi(available && debounced ? `/api/v1/colectivos?q=${encodeURIComponent(debounced)}` : null)

  return (
    <div className="wrap content">
      <BackButton />
      <h1 className="page-title page-title-icon">
        <ModeIcon mode="COLECTIVO" size="lg" />
        Colectivos
      </h1>
      <p className="page-subtitle">Buscá una línea para ver su recorrido y sus paradas.</p>

      {status.loading && <Skeleton variant="block" label="Cargando…" />}
      {status.data && !available && (
        <div className="bus-unavailable">
          Los datos de colectivos todavía no están disponibles. El servidor los descarga del feed oficial al arrancar y
          una vez por día; probá de nuevo en unos minutos.
        </div>
      )}

      {available && (
        <>
          <div className="search-box bus-search">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              inputMode="search"
              aria-label="Buscar línea de colectivo"
              placeholder={narrow ? 'Línea, por ejemplo 152' : 'Número o nombre de la línea, por ejemplo 152'}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {results.data && results.data.length === 0 && (
            <div className="loading-text">Sin resultados para “{debounced}”.</div>
          )}
          {results.data && results.data.length > 0 && (
            <div className="bus-results">
              {results.data.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  className={route.id === selectedId ? 'bus-result active' : 'bus-result'}
                  onClick={() => setSearchParams(busParams(route.shortName, route.id))}
                >
                  <BusNumber route={route} />
                  <span className="bus-result-text">
                    <span className="bus-result-name">{busTitle(route)}</span>
                    {busDescription(route) && <span className="bus-result-agency">{busDescription(route)}</span>}
                    {route.agency && <span className="bus-result-agency">{operatorName(route.agency)}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedId ? (
            <>
              <button type="button" className="bus-show-all chevrons-host" onClick={() => setSearchParams({})}>
                <span className="live-dot" aria-hidden="true" /> Ver todos los colectivos en vivo
              </button>
              <RouteDetail
                routeId={selectedId}
                line={searchParams.get('numero')}
                headsign={searchParams.get('destino')}
                initialDirection={searchParams.has('sentido') ? Number(searchParams.get('sentido')) : null}
                initialStop={searchParams.get('parada')}
              />
            </>
          ) : (
            <>
              <MyBuses />
              <LiveBusesMap
                onSelectRoute={(bus) =>
                  setSearchParams({
                    ...busParams(bus.line, bus.routeId),
                    ...(bus.line ? { numero: bus.line } : {}),
                    ...(bus.headsign ? { destino: bus.headsign } : {}),
                    ...(Number.isInteger(bus.direction) ? { sentido: String(bus.direction) } : {}),
                  })
                }
              />
            </>
          )}

          <p className="airports-source">
            Datos: feed GTFS de colectivos de la API Transporte de Buenos Aires. Se actualiza una vez por día.
          </p>
        </>
      )}
    </div>
  )
}
