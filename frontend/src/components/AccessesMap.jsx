import { useEffect, useMemo } from 'react'
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import Chevrons from './Chevrons.jsx'
import MapCard from './MapCard.jsx'
import SpeedGauge from './SpeedGauge.jsx'
import { delayMinutes, speedPercent, trafficStatus } from '../utils/traffic.js'

/**
 * Tarjeta de un tramo: el escudo de la ruta, un velocimetro con el
 * porcentaje de la velocidad normal, hacia donde va, el estado con la
 * demora estimada y las velocidades con la barra.
 */
function SegmentCard({ segment }) {
  const { label, color } = trafficStatus(segment.status)
  const percent = speedPercent(segment)
  const delay = delayMinutes(segment)
  return (
    <MapCard
      badge={<span className="map-card-shield">{segment.access.road}</span>}
      kicker={segment.access.name}
      icon={<SpeedGauge percent={percent} color={color} />}
      title={segment.name}
      subtitle={
        segment.towards ? (
          <span className="map-card-towards chevrons-host" style={{ '--status-color': color }}>
            <Chevrons /> Hacia {segment.towards}
          </span>
        ) : undefined
      }
    >
      <div className="map-card-status" style={{ '--status-color': color }}>
        <i />
        {label}
      </div>
      {delay != null && <div className="map-card-delay">≈ {delay} min de demora en este tramo</div>}
      {segment.currentSpeed != null && (
        <>
          <div className="map-card-stats">
            <div className="map-card-stat">
              <strong>{segment.currentSpeed}</strong>
              <span>km/h ahora</span>
            </div>
            {segment.freeFlowSpeed != null && (
              <div className="map-card-stat">
                <strong>{segment.freeFlowSpeed}</strong>
                <span>km/h normal</span>
              </div>
            )}
            {percent != null && (
              <div className="map-card-stat">
                <strong>{percent}%</strong>
                <span>de lo normal</span>
              </div>
            )}
          </div>
          {percent != null && (
            <div className="speed-bar map-card-speed" aria-hidden="true">
              <span style={{ width: `${percent}%`, background: color }} />
            </div>
          )}
        </>
      )}
    </MapCard>
  )
}

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
          <SegmentCard segment={segment} />
        </Polyline>
      ))}
      <FitToSegments positions={positions} />
    </MapContainer>
  )
}
