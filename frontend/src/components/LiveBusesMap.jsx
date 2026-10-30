import { useState } from 'react'
import { CircleMarker, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { badgeIcon } from '../utils/mapIcons.js'
import Chevrons from './Chevrons.jsx'
import MapCard from './MapCard.jsx'
import UpdatedAt from './UpdatedAt.jsx'
import { useApi } from '../hooks/useApi.js'
import Skeleton from './Skeleton.jsx'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { busFavoriteId } from '../utils/busNames.js'
import '../pages/EcobiciPage.css'

const REFRESH_MS = 30_000
const ZOOM = 11
// Son miles: con el mapa lejos van como puntos en un canvas (livianos); desde
// este zoom, con el dibujo de un colectivo, y solo los que estan a la vista.
const ICON_ZOOM = 14
const BUS_BADGE = { bg: '#f4c11b', fg: '#17171a', border: '#17171a', shape: 'square', size: 24 }

function ViewTracker({ onChange }) {
  const map = useMapEvents({
    zoomend: () => onChange({ zoom: map.getZoom(), bounds: map.getBounds().pad(0.2) }),
    moveend: () => onChange({ zoom: map.getZoom(), bounds: map.getBounds().pad(0.2) }),
  })
  return null
}

/**
 * Mapa con todos los colectivos que se estan moviendo ahora. Son miles
 * de puntos: se dibujan en un canvas (preferCanvas) en vez de un
 * elemento SVG por colectivo. Tocar uno abre su tarjeta, con un enlace
 * al recorrido de la linea.
 */
export default function LiveBusesMap({ onSelectRoute }) {
  const { data, loading, reload, refreshing } = useApi('/api/v1/colectivos/vivo', { refreshMs: REFRESH_MS })
  const { ids: favorites } = useFavoriteList('colectivos')
  // Debajo del mapa, tus colectivos como filtro (como las leyendas de los otros mapas).
  const [lineFilter, setLineFilter] = useState(null)
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState({ zoom: ZOOM, bounds: null })
  const showIcons = view.zoom >= ICON_ZOOM && view.bounds

  if (loading) return <Skeleton variant="map" label="Cargando colectivos en vivo…" />
  if (!data?.available) return null

  const counts = {}
  for (const bus of data.buses) {
    const id = busFavoriteId(bus.line)
    if (id) counts[id] = (counts[id] ?? 0) + 1
  }
  const filter = lineFilter && favorites.includes(lineFilter) ? lineFilter : null
  const buses = filter ? data.buses.filter((bus) => busFavoriteId(bus.line) === filter) : data.buses

  return (
    <section className="live-buses" aria-label="Colectivos en movimiento">
      <div className="live-buses-head">
        <span className="section-label live-buses-title">
          <span className="live-dot" aria-hidden="true" /> Colectivos en movimiento ahora
        </span>
        <span className="live-buses-meta">
          <span>
            <strong>{buses.length.toLocaleString('es-AR')}</strong> {filter ? `de la línea ${filter}` : 'colectivos'}
          </span>
          <UpdatedAt at={data.updatedAt} onRefresh={reload} refreshing={refreshing} />
        </span>
      </div>
      <MapContainer className="live-buses-map" center={[-34.62, -58.45]} zoom={ZOOM} scrollWheelZoom preferCanvas>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ViewTracker onChange={setView} />
        {buses.map((bus, index) => {
          if (showIcons) {
            if (!view.bounds.contains([bus.latitude, bus.longitude])) return null
            return (
              <Marker
                key={bus.id || index}
                position={[bus.latitude, bus.longitude]}
                title={`Línea ${bus.line || '?'}`}
                icon={badgeIcon('bus', { ...BUS_BADGE, active: selected?.id === bus.id })}
                eventHandlers={{ click: () => setSelected(bus) }}
              />
            )
          }
          return (
            <CircleMarker
              key={bus.id || index}
              center={[bus.latitude, bus.longitude]}
              radius={3.5}
              pathOptions={{ color: '#17171a', weight: 1, fillColor: '#f4c11b', fillOpacity: 0.95 }}
              eventHandlers={{ click: () => setSelected(bus) }}
            />
          )
        })}
        {selected && (
          <MapCard
            key={selected.id}
            position={[selected.latitude, selected.longitude]}
            onClose={() => setSelected(null)}
            badge={<span className="map-card-bus">{selected.line || '?'}</span>}
            kicker="Colectivo en vivo"
            title={`Línea ${selected.line || '?'}`}
            subtitle={selected.headsign ? `Hacia ${selected.headsign.replace(/^a\s+/i, '')}` : null}
            actions={
              selected.routeId && (
                <button type="button" className="station-popup-link chevrons-host" onClick={() => onSelectRoute(selected)}>
                  Ver el recorrido <Chevrons />
                </button>
              )
            }
          />
        )}
      </MapContainer>
      {favorites.length > 0 && (
        <div className="ecobici-legend filters live-buses-filter" role="group" aria-label="Ver en el mapa solo un colectivo">
          {favorites.map((line) => {
            const active = filter === line
            return (
              <button
                key={line}
                type="button"
                className={active ? 'active' : undefined}
                aria-pressed={active}
                onClick={() => {
                  setSelected(null)
                  setLineFilter(active ? null : line)
                }}
              >
                <span className="live-buses-filter-number">{line}</span>
                <small>{counts[line] ?? 0}</small>
              </button>
            )
          })}
          {filter && (
            <button type="button" className="ecobici-legend-all" onClick={() => setLineFilter(null)}>
              Ver todos
            </button>
          )}
        </div>
      )}
      <p className="live-buses-hint">
        Tocá un colectivo para ver su línea y su recorrido.
        {!showIcons && ' Acercá el mapa para verlos con su dibujo.'}
      </p>
    </section>
  )
}
