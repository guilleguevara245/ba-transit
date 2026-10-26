import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import { useApi } from '../hooks/useApi.js'
import { useNow } from '../hooks/useNow.js'
import { formatRelativeTime } from '../utils/format.js'
import Skeleton from './Skeleton.jsx'

const REFRESH_MS = 30_000

/**
 * Mapa con todos los colectivos que se estan moviendo ahora. Son miles
 * de puntos: se dibujan en un canvas (preferCanvas) en vez de un
 * elemento SVG por colectivo. Tocar uno abre su linea.
 */
export default function LiveBusesMap({ onSelectRoute }) {
  const { data, loading } = useApi('/api/v1/colectivos/vivo', { refreshMs: REFRESH_MS })
  const now = useNow()

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
            eventHandlers={{ click: () => bus.routeId && onSelectRoute(bus) }}
          >
            <Tooltip>
              <strong>Línea {bus.line || '?'}</strong>
              {bus.headsign && ` · ${bus.headsign}`}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <p className="live-buses-hint">Tocá un colectivo para ver el recorrido de su línea.</p>
    </section>
  )
}
