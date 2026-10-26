import { useState } from 'react'
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet'
import Chevrons from './Chevrons.jsx'
import MapCard from './MapCard.jsx'
import { useApi } from '../hooks/useApi.js'
import { useNow } from '../hooks/useNow.js'
import { formatRelativeTime } from '../utils/format.js'
import Skeleton from './Skeleton.jsx'

const REFRESH_MS = 30_000

/**
 * Mapa con todos los colectivos que se estan moviendo ahora. Son miles
 * de puntos: se dibujan en un canvas (preferCanvas) en vez de un
 * elemento SVG por colectivo. Tocar uno abre su tarjeta, con un enlace
 * al recorrido de la linea.
 */
export default function LiveBusesMap({ onSelectRoute }) {
  const { data, loading } = useApi('/api/v1/colectivos/vivo', { refreshMs: REFRESH_MS })
  const now = useNow()
  const [selected, setSelected] = useState(null)

  if (loading) return <Skeleton variant="map" label="Cargando colectivos en vivo…" />
  if (!data?.available) return null

  return (
    <section className="live-buses" aria-label="Colectivos en movimiento">
      <div className="live-buses-head">
        <span className="section-label live-buses-title">
          <span className="live-dot" aria-hidden="true" /> Colectivos en movimiento ahora
        </span>
        <span className="live-buses-meta">
          <strong>{data.buses.length.toLocaleString('es-AR')}</strong> colectivos
          {data.updatedAt && ` · actualizado ${formatRelativeTime(data.updatedAt, now)}`}
        </span>
      </div>
      <MapContainer className="live-buses-map" center={[-34.62, -58.45]} zoom={11} scrollWheelZoom preferCanvas>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {data.buses.map((bus, index) => (
          <CircleMarker
            key={bus.id || index}
            center={[bus.latitude, bus.longitude]}
            radius={3.5}
            pathOptions={{ color: '#17171a', weight: 1, fillColor: '#f4c11b', fillOpacity: 0.95 }}
            eventHandlers={{ click: () => setSelected(bus) }}
          />
        ))}
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
      <p className="live-buses-hint">Tocá un colectivo para ver su línea y su recorrido.</p>
    </section>
  )
}
