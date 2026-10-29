import { useEffect, useMemo, useState } from 'react'
import { divIcon } from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import MapCard, { MapCardIcon } from './MapCard.jsx'
import { useApi } from '../hooks/useApi.js'
import { useNow } from '../hooks/useNow.js'
import { formatRelativeTime } from '../utils/format.js'
import { GLYPHS } from '../utils/mapIcons.js'
import {
  FLIGHT_GROUPS,
  flightDetail,
  flightGroup,
  flightStatus,
  flightTitle,
  formatAltitude,
  formatSpeed,
  movingNow,
} from '../utils/flights.js'
import './LiveFlights.css'

// El backend guarda el dato de adsb.lol 30 segundos.
const REFRESH_MS = 30_000
const GROUP_COLOR = Object.fromEntries(FLIGHT_GROUPS.map((g) => [g.key, g.color]))
// Mismo trazo que el icono de Aeropuertos.
const AIRPORT_ICON = 'M2 13l9-2 4-8h2l-2 9 6 1 1 2-7 1-3 6h-2l1-7-9-2z'

/** Avion visto desde arriba, girado hacia donde va. */
function PlaneSvg({ group, heading = 0, size = 18 }) {
  // Fuera del mapa, "en vuelo" toma el color del texto (en modo oscuro, claro).
  const color = group === 'air' ? 'var(--text)' : GROUP_COLOR[group]
  return (
    <svg
      className="flight-plane"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ transform: `rotate(${heading}deg)`, color }}
      aria-hidden="true"
      focusable="false"
    >
      <path d={GLYPHS.plane} />
    </svg>
  )
}

const iconCache = new Map()

function planeIcon(group, heading, active) {
  const angle = Math.round((heading ?? 0) / 5) * 5
  const key = `${group}-${angle}-${active}`
  if (!iconCache.has(key)) {
    const size = active ? 30 : 22
    iconCache.set(
      key,
      divIcon({
        className: active ? 'flight-icon active' : 'flight-icon',
        html:
          `<svg class="flight-plane" viewBox="0 0 24 24" width="${size}" height="${size}" ` +
          `style="transform:rotate(${angle}deg);color:${GROUP_COLOR[group]}"><path d="${GLYPHS.plane}"/></svg>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      }),
    )
  }
  return iconCache.get(key)
}

/** target: [lat, lon] del avion al elegirlo (no lo sigue en cada actualizacion). */
function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 11), { duration: 0.6 })
  }, [map, target])
  return null
}

function FlightCard({ flight }) {
  const group = flightGroup(flight)
  const altitude = formatAltitude(flight.altitude)
  const speed = formatSpeed(flight.speed)
  return (
    <MapCard
      badge={<MapCardIcon path={AIRPORT_ICON} />}
      kicker={flight.airline ?? 'Vuelo'}
      title={flightTitle(flight)}
      subtitle={flightDetail(flight) ?? undefined}
    >
      <div className="map-card-status" style={{ '--status-color': GROUP_COLOR[group] }}>
        <i />
        {flightStatus(flight)}
      </div>
      {(altitude || speed) && (
        <div className="map-card-stats">
          {altitude && (
            <div className="map-card-stat">
              <strong>{altitude}</strong>
              <span>de altura</span>
            </div>
          )}
          {speed && !flight.onGround && (
            <div className="map-card-stat">
              <strong>{speed}</strong>
              <span>de velocidad</span>
            </div>
          )}
        </div>
      )}
    </MapCard>
  )
}

/**
 * Aviones en vivo alrededor de Buenos Aires, sobre el mapa de los
 * aeropuertos (children: los marcadores de Aeroparque y Ezeiza).
 * bounds: encuadre inicial del mapa.
 */
export default function LiveFlights({ bounds, children }) {
  const { data, error } = useApi('/api/v1/vuelos', { refreshMs: REFRESH_MS })
  const now = useNow(15_000)
  const [groupFilter, setGroupFilter] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  // Al elegir un avion de la lista el mapa va hasta el; tocandolo en el mapa, no hace falta.
  const [flyTarget, setFlyTarget] = useState(null)

  const flights = useMemo(() => data?.flights ?? [], [data])
  const counts = useMemo(() => {
    const result = Object.fromEntries(FLIGHT_GROUPS.map((g) => [g.key, 0]))
    for (const f of flights) result[flightGroup(f)] += 1
    return result
  }, [flights])
  const visible = groupFilter
    ? flights.filter((f) => f.id === selectedId || flightGroup(f) === groupFilter)
    : flights
  const moving = movingNow(flights)

  return (
    <section className="flights" aria-labelledby="flights-title">
      <div className="flights-head">
        <h2 className="section-label" id="flights-title">
          Aviones en vivo {data?.updatedAt && <span className="live-dot" aria-hidden="true" />}
        </h2>
        {data?.updatedAt && (
          <span className="flights-updated">Actualizado {formatRelativeTime(data.updatedAt, now)}</span>
        )}
      </div>

      {data && (
        <div className="ecobici-legend filters" role="group" aria-label="Filtrar los aviones del mapa">
          {FLIGHT_GROUPS.map((g) => {
            const active = groupFilter === g.key
            return (
              <button
                key={g.key}
                type="button"
                className={active ? 'active' : undefined}
                aria-pressed={active}
                onClick={() => setGroupFilter(active ? null : g.key)}
              >
                <PlaneSvg group={g.key} heading={45} size={16} />
                {g.label}
                <small>{counts[g.key]}</small>
              </button>
            )
          })}
          {groupFilter && (
            <button type="button" className="ecobici-legend-all" onClick={() => setGroupFilter(null)}>
              Ver todos
            </button>
          )}
        </div>
      )}

      <MapContainer className="airports-map" bounds={bounds} boundsOptions={{ padding: [60, 60] }}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {children}
        {visible.map((f) => (
          <Marker
            key={f.id}
            position={[f.latitude, f.longitude]}
            title={`${flightTitle(f)}: ${flightStatus(f)}`}
            icon={planeIcon(flightGroup(f), f.heading, f.id === selectedId)}
            zIndexOffset={f.onGround ? 0 : 500}
            eventHandlers={{ click: () => setSelectedId(f.id) }}
          >
            <FlightCard flight={f} />
          </Marker>
        ))}
        <FlyTo target={flyTarget} />
      </MapContainer>

      {!data && error && (
        <p className="flights-empty">Los aviones en vivo no están disponibles por el momento: probá en un rato.</p>
      )}
      {(!data || !data.updatedAt) && !error && <p className="flights-empty">Buscando aviones…</p>}
      {data?.updatedAt && flights.length === 0 && (
        <p className="flights-empty">No hay aviones a la vista en este momento.</p>
      )}

      {data?.updatedAt && flights.length > 0 && (
        <div className="flights-moving">
          <h3 className="flights-moving-title">Aterrizando y despegando ahora</h3>
          {moving.length === 0 ? (
            <p className="flights-empty">Ningún avión aterrizando ni despegando en este momento.</p>
          ) : (
            <ul className="flights-list">
              {moving.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className={f.id === selectedId ? 'flights-row active' : 'flights-row'}
                    onClick={() => {
                      setSelectedId(f.id)
                      setFlyTarget([f.latitude, f.longitude])
                    }}
                  >
                    <PlaneSvg group={flightGroup(f)} heading={f.heading} />
                    <span className="flights-row-name">
                      {flightTitle(f)}
                      {f.airline && <small>{f.airline}</small>}
                    </span>
                    <span className="flights-row-status">
                      {flightStatus(f)}
                      {f.altitude != null && <small>{formatAltitude(f.altitude)}</small>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
