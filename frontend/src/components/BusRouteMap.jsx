import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import { badgeIcon } from '../utils/mapIcons.js'
import MapCard from './MapCard.jsx'
import { parseBusShortName, stopName } from '../utils/busNames.js'

function FitToRoute({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [28, 28] })
    }
  }, [map, positions])
  return null
}

/**
 * Mapa del recorrido de un colectivo: el sentido elegido resaltado, el
 * otro sentido mas tenue y las paradas del sentido elegido.
 */
export default function BusRouteMap({ route, directionIndex, className, vehicles = [] }) {
  const color = route.color ?? '#17171a'
  const active = route.directions[directionIndex]
  const positions = useMemo(() => active?.shape ?? [], [active])
  const busBadge = (
    <span className="map-card-bus" style={route.color ? { background: route.color } : undefined}>
      {parseBusShortName(route.shortName).number || '?'}
    </span>
  )

  return (
    <MapContainer className={className} center={[-34.6083, -58.4]} zoom={12} scrollWheelZoom>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {route.directions.map((direction, index) =>
        index === directionIndex ? null : (
          <Polyline
            key={direction.directionId}
            positions={direction.shape}
            pathOptions={{ color, weight: 3, opacity: 0.35, dashArray: '6 6' }}
          />
        ),
      )}

      {active && (
        <>
          <Polyline positions={active.shape} pathOptions={{ color, weight: 5, opacity: 0.9 }} />
          {active.stops.map((stop, index) => {
            const isEnd = index === 0 || index === active.stops.length - 1
            return (
              <CircleMarker
                key={`${stop.id}-${index}`}
                center={[stop.latitude, stop.longitude]}
                radius={isEnd ? 7 : 4}
                pathOptions={{ color, fillColor: '#ffffff', fillOpacity: 1, weight: isEnd ? 3 : 2 }}
              >
                <MapCard
                  badge={busBadge}
                  kicker={index === 0 ? 'Cabecera' : index === active.stops.length - 1 ? 'Última parada' : 'Parada'}
                  title={stopName(stop.name)}
                  subtitle={[
                    `Parada ${index + 1} de ${active.stops.length}`,
                    index > 0 && active.minutes?.[index] != null ? `+${active.minutes[index]} min desde la cabecera` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
              </CircleMarker>
            )
          })}
        </>
      )}

      {vehicles.map((v) => (
        <Marker
          key={v.id}
          position={[v.latitude, v.longitude]}
          icon={badgeIcon('bus', { bg: '#f4c11b', fg: '#17171a', border: '#17171a', shape: 'square', size: 28 })}
        >
          <MapCard
            badge={busBadge}
            kicker="Colectivo en vivo"
            title={`Línea ${route.shortName || '?'}`}
            subtitle={[
              v.headsign ? `Hacia ${v.headsign.replace(/^a\s+/i, '')}` : null,
              v.ageSeconds > 60 ? `posición de hace ${Math.round(v.ageSeconds / 60)} min` : 'posición actual',
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        </Marker>
      ))}

      <FitToRoute positions={positions} />
    </MapContainer>
  )
}
