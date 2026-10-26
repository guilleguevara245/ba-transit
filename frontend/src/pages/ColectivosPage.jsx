import LiveBusesMap from '../components/LiveBusesMap.jsx'
import Skeleton from '../components/Skeleton.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import BusRouteMap from '../components/BusRouteMap.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { useApi } from '../hooks/useApi.js'
import { useDebounce } from '../hooks/useDebounce.js'
import { busDescription, busTitle } from '../utils/busNames.js'
import { formatDuration } from '../utils/travelTime.js'
import './ModePage.css'
import './ColectivosPage.css'

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

/** Parametros extra por si el id del feed en vivo no esta en el GTFS del dia (ver ColectivoService.find). */
function detailPath(routeId, line, headsign) {
  const params = new URLSearchParams()
  if (line) params.set('numero', line)
  if (headsign) params.set('destino', headsign)
  const query = params.toString()
  return `/api/v1/colectivos/${encodeURIComponent(routeId)}${query ? `?${query}` : ''}`
}

function RouteDetail({ routeId, line, headsign }) {
  const { data: route, loading, error } = useApi(detailPath(routeId, line, headsign))
  const [directionIndex, setDirectionIndex] = useState(0)
  const live = useApi(`/api/v1/colectivos/${encodeURIComponent(routeId)}/vivo`, { refreshMs: LIVE_REFRESH_MS })

  useEffect(() => setDirectionIndex(0), [routeId])

  if (loading) return <Skeleton variant="map" label="Cargando recorrido…" />
  if (String(error ?? '').includes('respondió 404')) {
    return (
      <div className="bus-unavailable">
        No encontramos el recorrido {line ? `de la línea ${line}` : 'de esta línea'} en los datos de hoy. Probá
        buscarla por número.
      </div>
    )
  }
  if (error) return <ErrorMessage what="el recorrido" error={error} />
  if (!route) return null

  const direction = route.directions[directionIndex]
  // Solo los colectivos del sentido elegido (el feed usa el mismo direction_id que el GTFS).
  const knownMinutes = (direction?.minutes ?? []).filter((m) => m != null)
  const totalMinutes = knownMinutes.length > 1 ? Math.max(...knownMinutes) : null
  const vehicles = (live.data?.vehicles ?? []).filter((v) => !direction || v.direction === direction.directionId)

  return (
    <section className="bus-detail">
      <header className="bus-detail-head">
        <BusNumber route={route} large />
        <div>
          <h2 className="bus-detail-name">{busTitle(route)}</h2>
          {busDescription(route) && <div className="bus-detail-agency">{busDescription(route)}</div>}
          {route.agency && <div className="bus-detail-agency">{route.agency}</div>}
        </div>
      </header>

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
              Hacia {d.headsign || `sentido ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      {live.data?.available && (
        <div className="bus-live" role="status">
          <span className="live-dot" aria-hidden="true" />
          {vehicles.length === 0
            ? 'Sin colectivos en vivo en este sentido ahora.'
            : `${vehicles.length} ${vehicles.length === 1 ? 'colectivo' : 'colectivos'} en vivo en este sentido`}
        </div>
      )}

      <div className="bus-layout">
        <BusRouteMap className="bus-map" route={route} directionIndex={directionIndex} vehicles={vehicles} />
        {direction && (
          <div className="panel bus-stops">
            <div className="panel-title">
              Paradas
              <span className="count">{direction.stops.length}</span>
            </div>
            {totalMinutes != null && (
              <div className="bus-total">
                Recorrido completo: <strong>≈ {formatDuration(totalMinutes)}</strong>
                <span> según el horario del feed</span>
              </div>
            )}
            <ol className="bus-stop-list" style={{ '--bus-color': route.color ?? '#17171a' }}>
              {direction.stops.map((stop, index) => (
                <li key={`${stop.id}-${index}`}>
                  <span>{stop.name}</span>
                  {direction.minutes?.[index] != null && index > 0 && (
                    <span className="bus-stop-minutes">+{direction.minutes[index]} min</span>
                  )}
                </li>
              ))}
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
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('linea')
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
          Los datos de colectivos todavía no están disponibles. El servidor los descarga del feed oficial
          al arrancar y una vez por día; probá de nuevo en unos minutos.
        </div>
      )}

      {available && (
        <>
          <div className="search-box bus-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              inputMode="search"
              aria-label="Buscar línea de colectivo"
              placeholder="Número o nombre de la línea, por ejemplo 152"
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
                  onClick={() => setSearchParams({ linea: route.id })}
                >
                  <BusNumber route={route} />
                  <span className="bus-result-text">
                    <span className="bus-result-name">{busTitle(route)}</span>
                    {busDescription(route) && <span className="bus-result-agency">{busDescription(route)}</span>}
                    {route.agency && <span className="bus-result-agency">{route.agency}</span>}
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
              />
            </>
          ) : (
            <LiveBusesMap
              onSelectRoute={(bus) =>
                setSearchParams({
                  linea: bus.routeId,
                  ...(bus.line ? { numero: bus.line } : {}),
                  ...(bus.headsign ? { destino: bus.headsign } : {}),
                })
              }
            />
          )}

          <p className="airports-source">
            Datos: feed GTFS de colectivos de la API Transporte de Buenos Aires. Se actualiza una vez por día.
          </p>
        </>
      )}
    </div>
  )
}
