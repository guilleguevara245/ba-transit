import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import MapCard, { MapCardIcon } from '../components/MapCard.jsx'
import BackButton from '../components/BackButton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import Skeleton from '../components/Skeleton.jsx'
import UpdatedAt from '../components/UpdatedAt.jsx'
import { useApi } from '../hooks/useApi.js'
import { NARROW, useMediaQuery } from '../hooks/useMediaQuery.js'
import { AVAILABILITY_BADGES, availability, normalizeText, stationName, stockLevel } from '../utils/ecobici.js'
import { badgeIcon } from '../utils/mapIcons.js'
import MapBadge from '../components/MapBadge.jsx'
import EcobiciPlaceIcon from '../components/EcobiciPlaceIcon.jsx'
import EcobiciStock from '../components/EcobiciStock.jsx'
import './ModePage.css'
import './EcobiciPage.css'
import CountUp from '../components/CountUp.jsx'

const REFRESH_MS = 60_000
// Mismo trazo que el icono de EcoBici de la barra de navegacion.
const ECOBICI_ICON =
  'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5 9 8h6l3.5 6.5M9 8l3 6.5h-1M14 5h2.5'
const MAX_RESULTS = 12
const LEGEND = ['ok', 'low', 'empty', 'off']

/** target: [lat, lon] de la estacion al elegirla (no vuelve a ella en cada actualizacion). */
function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, 16, { duration: 0.6 })
  }, [map, target])
  return null
}

/**
 * Al cambiar el filtro: cierra la tarjeta abierta y vuelve a encuadrar el
 * mapa con las estaciones que quedan a la vista. reset: un numero que
 * cambia con cada filtro elegido.
 */
function ResetView({ reset, points }) {
  const map = useMap()
  // Los puntos cambian con cada actualizacion de las estaciones; el encuadre, solo al elegir un filtro.
  const latest = useRef(points)
  latest.current = points
  useEffect(() => {
    if (!reset) return
    map.closePopup()
    if (latest.current.length > 0) {
      map.flyToBounds(latest.current, { padding: [40, 40], maxZoom: 15, duration: 0.6 })
    }
  }, [map, reset])
  return null
}

/** EcoBici: estaciones con bicis y anclajes libres en vivo. */
export default function EcobiciPage() {
  const narrow = useMediaQuery(NARROW)
  const { data, loading, error, reload, refreshing } = useApi('/api/v1/ecobici', { refreshMs: REFRESH_MS })
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [flyTarget, setFlyTarget] = useState(null)
  const [reset, setReset] = useState(0)
  // Referencia elegida: el mapa muestra solo esas estaciones (null = todas).
  const [levelFilter, setLevelFilter] = useState(null)

  const stations = useMemo(() => data?.stations ?? [], [data])
  const totals = useMemo(
    () => ({
      bikes: stations.reduce((sum, s) => sum + (s.renting ? s.bikes : 0), 0),
      withBikes: stations.filter((s) => s.renting && s.bikes > 0).length,
    }),
    [stations],
  )
  const q = normalizeText(query.trim())
  const results = q
    ? stations.filter((s) => normalizeText(`${s.name} ${s.address}`).includes(q)).slice(0, MAX_RESULTS)
    : []
  const countByLevel = useMemo(() => {
    const counts = { ok: 0, low: 0, empty: 0, off: 0 }
    for (const s of stations) counts[availability(s).key] += 1
    return counts
  }, [stations])
  // La estacion elegida en el buscador se ve aunque no sea del filtro.
  const visibleStations = levelFilter
    ? stations.filter((s) => s.id === selectedId || availability(s).key === levelFilter)
    : stations

  function select(station) {
    setSelectedId(station.id)
    setFlyTarget([station.latitude, station.longitude])
  }

  /** Elegir un filtro (o "Ver todas") deja de mostrar la estacion elegida y vuelve a encuadrar el mapa. */
  function chooseLevel(key) {
    setLevelFilter(key)
    setSelectedId(null)
    setFlyTarget(null)
    setReset((n) => n + 1)
  }

  return (
    <div className="wrap content">
      <BackButton />
      <h1 className="page-title page-title-icon">
        <ModeIcon mode="ECOBICI" size="lg" />
        EcoBici
      </h1>
      <p className="page-subtitle">
        Bicis y anclajes libres en cada estación.
      </p>
      {data?.available && (
        <UpdatedAt className="page-updated" at={data.updatedAt} onRefresh={reload} refreshing={refreshing} />
      )}

      {loading && <Skeleton variant="map" label="Cargando estaciones de EcoBici…" />}
      {error && !data && <ErrorMessage what="las estaciones de EcoBici" error={error} />}
      {data && !data.available && (
        <div className="bus-unavailable">
          Los datos de EcoBici no están disponibles en este momento. Probá de nuevo en unos minutos.
        </div>
      )}

      {data?.available && (
        <>
          <div className="ecobici-summary">
            <span>
              <strong>{totals.bikes.toLocaleString('es-AR')}</strong> bicis disponibles
            </span>
            <span>
              <strong>{totals.withBikes}</strong> de {stations.length} estaciones con bicis
            </span>
          </div>

          <div className="search-box ecobici-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              inputMode="search"
              aria-label="Buscar estación de EcoBici"
              placeholder={narrow ? 'Estación o calle' : 'Buscá una estación o calle, por ejemplo Plaza Italia'}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {q && results.length === 0 && <div className="loading-text">Sin estaciones para “{query.trim()}”.</div>}
          {results.length > 0 && (
            <ul className="ecobici-results">
              {results.map((s) => {
                const level = availability(s)
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={s.id === selectedId ? 'ecobici-result active' : 'ecobici-result'}
                      onClick={() => select(s)}
                    >
                      <MapBadge {...AVAILABILITY_BADGES[level.key]} />
                      <span className="ecobici-result-name">
                        {stationName(s.name)}
                        {s.address && <small>{s.address}</small>}
                      </span>
                      {/* Los numeros con el color de cuantos quedan (como los dibujos de la tarjeta). */}
                      <span className="ecobici-counts">
                        <strong className={`ecobici-count-${s.renting ? stockLevel(s.bikes, 'bikes').key : 'off'}`}>
                          <CountUp value={s.bikes} />
                        </strong>{' '}
                        {s.bikes === 1 ? 'bici' : 'bicis'} ·{' '}
                        <strong className={`ecobici-count-${s.renting ? stockLevel(s.docks, 'docks').key : 'off'}`}>
                          <CountUp value={s.docks} />
                        </strong>{' '}
                        {s.docks === 1 ? 'libre' : 'libres'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="ecobici-legend filters" role="group" aria-label="Filtrar el mapa por disponibilidad">
            {LEGEND.map((key) => {
              const sample = { ok: { renting: true, bikes: 9 }, low: { renting: true, bikes: 2 }, empty: { renting: true, bikes: 0 }, off: { renting: false } }[key]
              const level = availability(sample)
              const active = levelFilter === key
              return (
                <button
                  key={key}
                  type="button"
                  className={active ? 'active' : undefined}
                  aria-pressed={active}
                  onClick={() => chooseLevel(active ? null : key)}
                >
                  <MapBadge {...AVAILABILITY_BADGES[key]} />
                  {level.label}
                  <small>{countByLevel[key]}</small>
                </button>
              )
            })}
            {levelFilter && (
              <button type="button" className="ecobici-legend-all" onClick={() => chooseLevel(null)}>
                Ver todas
              </button>
            )}
          </div>

          <MapContainer className="ecobici-map" center={[-34.6037, -58.4]} zoom={13} scrollWheelZoom>
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {visibleStations.map((s) => {
              const level = availability(s)
              const badge = AVAILABILITY_BADGES[level.key]
              const active = s.id === selectedId
              const card = (
                <MapCard
                  badge={<MapCardIcon path={ECOBICI_ICON} />}
                  kicker="Estación EcoBici"
                  icon={<EcobiciPlaceIcon name={s.name} />}
                  title={stationName(s.name)}
                >
                  <div className="map-card-status" style={{ '--status-color': level.color }}>
                    <i />
                    {level.label}
                  </div>
                  {s.renting && <EcobiciStock bikes={s.bikes} docks={s.docks} />}
                </MapCard>
              )
              return (
                <Marker
                  key={s.id}
                  position={[s.latitude, s.longitude]}
                  title={`${stationName(s.name)}: ${level.label}`}
                  icon={badgeIcon(badge.glyph, { ...badge, size: 22, active })}
                  eventHandlers={{ click: () => select(s) }}
                >
                  {card}
                </Marker>
              )
            })}
            <FlyTo target={flyTarget} />
            <ResetView reset={reset} points={visibleStations.map((s) => [s.latitude, s.longitude])} />
          </MapContainer>

          <p className="airports-source">Datos: EcoBici (GBFS) a través de la API Transporte de Buenos Aires.</p>
        </>
      )}
    </div>
  )
}
