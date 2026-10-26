import { useEffect, useMemo } from 'react'
import { MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { trafficStatus } from '../utils/traffic.js'

function FitToSegments({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [28, 28] })
    }
  }, [map, positions])
  return null
}

/**
 * Mapa con los tramos que mide TomTom, pintados segun su estado. Sirve
 * tambien para comprobar que cada punto de accesos.json cae sobre la
 * autopista correcta.
 */
export default function AccessesMap({ accesses, className }) {
  const segments = useMemo(
    () =>
      accesses.flatMap((access) =>
        access.segments
          .filter((segment) => segment.geometry.length > 1)
          .map((segment) => ({ ...segment, access })),
      ),
    [accesses],
  )
  const positions = useMemo(() => segments.flatMap((segment) => segment.geometry), [segments])

  return (
    <MapContainer className={className} center={[-34.65, -58.5]} zoom={10} scrollWheelZoom>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {segments.map((segment) => (
        <Polyline
          key={`${segment.access.id}-${segment.name}`}
          positions={segment.geometry}
          pathOptions={{ color: trafficStatus(segment.status).color, weight: 7, opacity: 0.85 }}
        >
          <Tooltip sticky>
            <strong>{segment.access.name}</strong>
            <br />
            {segment.name} · {trafficStatus(segment.status).label}
            {segment.currentSpeed != null && ` · ${segment.currentSpeed} km/h`}
          </Tooltip>
        </Polyline>
      ))}
      <FitToSegments positions={positions} />
    </MapContainer>
  )
}
