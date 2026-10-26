import { useEffect, useMemo } from 'react'
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import MapCard, { MapCardIcon } from './MapCard.jsx'
import { speedPercent, trafficStatus } from '../utils/traffic.js'

// Mismo trazo que el icono de Accesos.
const ACCESS_ICON = 'M8 3 5 21m11-18 3 18M12 4v3m0 4v3m0 4v3'

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
          // Con las dos manos medidas se dibuja cada una con su estado.
          .flatMap((segment) =>
            segment.directions?.length
              ? segment.directions.map((d) => ({ ...d, name: segment.name }))
              : [segment],
          )
          .filter((segment) => segment.geometry?.length > 1)
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
          key={`${segment.access.id}-${segment.name}-${segment.towards ?? ''}`}
          positions={segment.geometry}
          pathOptions={{ color: trafficStatus(segment.status).color, weight: 7, opacity: 0.85 }}
        >
          <MapCard badge={<MapCardIcon path={ACCESS_ICON} />} kicker={segment.access.name} title={segment.name} subtitle={segment.towards ? `Hacia ${segment.towards}` : undefined}>
            <div className="map-card-status" style={{ '--status-color': trafficStatus(segment.status).color }}>
              <i />
              {trafficStatus(segment.status).label}
            </div>
            {segment.currentSpeed != null && (
              <div className="map-card-stats">
                <div className="map-card-stat">
                  <strong>{segment.currentSpeed}</strong>
                  <span>km/h ahora</span>
                </div>
                {segment.freeFlowSpeed != null && (
                  <div className="map-card-stat">
                    <strong>{segment.freeFlowSpeed}</strong>
                    <span>km/h sin tránsito</span>
                  </div>
                )}
                {speedPercent(segment) != null && (
                  <div className="map-card-stat">
                    <strong>{speedPercent(segment)}%</strong>
                    <span>de lo normal</span>
                  </div>
                )}
              </div>
            )}
          </MapCard>
        </Polyline>
      ))}
      <FitToSegments positions={positions} />
    </MapContainer>
  )
}
