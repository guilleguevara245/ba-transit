import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import MapCard, { MapCardIcon } from '../components/MapCard.jsx'
import BackButton from '../components/BackButton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useApi } from '../hooks/useApi.js'
import { useNow } from '../hooks/useNow.js'
import { formatRelativeTime } from '../utils/format.js'
import { AVAILABILITY_BADGES, availability, normalizeText, stationLabel } from '../utils/ecobici.js'
import { badgeIcon } from '../utils/mapIcons.js'
import MapBadge from '../components/MapBadge.jsx'
import './ModePage.css'
import './EcobiciPage.css'

const REFRESH_MS = 60_000
// Mismo trazo que el icono de EcoBici de la barra de navegacion.
const ECOBICI_ICON =
  'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5 9 8h6l3.5 6.5M9 8l3 6.5h-1M14 5h2.5'
const MAX_RESULTS = 12
const LEGEND = ['ok', 'low', 'empty', 'off']

function FlyTo({ station }) {
  const map = useMap()
  useEffect(() => {
    if (station) map.flyTo([station.latitude, station.longitude], 16, { duration: 0.6 })
  }, [map, station])
  return null
}

/** EcoBici: estaciones con bicis y anclajes libres en vivo. */
export default function EcobiciPage() {
  const { data, loading, error } = useApi('/api/v1/ecobici', { refreshMs: REFRESH_MS })
  const now = useNow()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
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
  const selected = stations.find((s) => s.id === selectedId)
  const countByLevel = useMemo(() => {
    const counts = { ok: 0, low: 0, empty: 0, off: 0 }
    for (const s of stations) counts[availability(s).key] += 1
    return counts
  }, [stations])
  const visibleStations = levelFilter
    ? stations.filter((s) => s.id === selectedId || availability(s).key === levelFilter)
    : stations

  return (
    <div className="wrap content">
      <BackButton />
      <h1 className="page-title page-title-icon">
        <ModeIcon mode="ECOBICI" size="lg" />
        EcoBici
      </h1>
      <p className="page-subtitle">
        Bicis y anclajes libres en cada estación.
        {data?.updatedAt && ` Actualizado ${formatRelativeTime(data.updatedAt, now)}.`}
      </p>

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
              placeholder="Buscá una estación o calle, por ejemplo Plaza Italia"
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
                      onClick={() => setSelectedId(s.id)}
                    >
                      <MapBadge {...AVAILABILITY_BADGES[level.key]} />
                      <span className="ecobici-result-name">
                        {stationLabel(s.name)}
                        {s.address && <small>{s.address}</small>}
                      </span>
                      <span className="ecobici-counts">
                        <strong>{s.bikes}</strong> bicis · {s.docks} libres
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
                  onClick={() => setLevelFilter(active ? null : key)}
                >
                  <MapBadge {...AVAILABILITY_BADGES[key]} />
                  {level.label}
                  <small>{countByLevel[key]}</small>
                </button>
              )
            })}
            {levelFilter && (
              <button type="button" className="ecobici-legend-all" onClick={() => setLevelFilter(null)}>
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
                  title={stationLabel(s.name)}
                >
                  <div className="map-card-status" style={{ '--status-color': level.color }}>
                    <i />
                    {level.label}
                  </div>
                  {s.renting && (
                    <div className="map-card-stats">
                      <div className="map-card-stat">
                        <strong>{s.bikes}</strong>
                        <span>{s.bikes === 1 ? 'bici disponible' : 'bicis disponibles'}</span>
                      </div>
                      <div className="map-card-stat">
                        <strong>{s.docks}</strong>
                        <span>{s.docks === 1 ? 'anclaje libre' : 'anclajes libres'}</span>
                      </div>
                    </div>
                  )}
                </MapCard>
              )
              return (
                <Marker
                  key={s.id}
                  position={[s.latitude, s.longitude]}
                  title={`${stationLabel(s.name)}: ${level.label}`}
                  icon={badgeIcon(badge.glyph, { ...badge, size: 22, active })}
                  eventHandlers={{ click: () => setSelectedId(s.id) }}
                >
                  {card}
                </Marker>
              )
            })}
            <FlyTo station={selected} />
          </MapContainer>

          <p className="airports-source">Datos: EcoBici (GBFS) a través de la API Transporte de Buenos Aires.</p>
        </>
      )}
    </div>
  )
}
