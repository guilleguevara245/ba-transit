import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { badgeIcon } from '../utils/mapIcons.js'
import BusIcon from './BusIcon.jsx'
import MapCard from './MapCard.jsx'
import { headsignName, stopName } from '../utils/busNames.js'

function FitToRoute({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [28, 28] })
    }
  }, [map, positions])
  return null
}

/** Zoom al mostrar una parada elegida en la lista (si el mapa esta mas lejos). */
const STOP_ZOOM = 16
/** Con el mapa mas lejos que esto, las paradas intermedias van chiquitas (si no, tapan el recorrido). */
const SMALL_STOPS_ZOOM = 14

function ZoomTracker({ onZoom }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  return null
}

/**
 * Lleva el mapa a la parada elegida en la lista y abre su tarjeta. En el
 * celular, si el mapa quedo fuera de la pantalla, primero lo trae.
 */
function FocusStop({ focused, stops, markers }) {
  const map = useMap()
  useEffect(() => {
    const stop = focused && stops?.[focused.index]
    if (!stop) return
    const box = map.getContainer().getBoundingClientRect()
    if (box.top < 0 || box.bottom > window.innerHeight) {
      map.getContainer().scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    const open = () => markers.current[focused.index]?.openPopup()
    map.once('moveend', open)
    map.flyTo([stop.latitude, stop.longitude], Math.max(map.getZoom(), STOP_ZOOM), { duration: 0.6 })
    return () => map.off('moveend', open)
  }, [map, focused, stops, markers])
  return null
}

/**
 * Mapa del recorrido de un colectivo: el sentido elegido resaltado, el
 * otro sentido mas tenue y las paradas del sentido elegido. focusedStop:
 * la parada elegida en la lista ({ index }), que se centra y se resalta.
 */
export default function BusRouteMap({ route, directionIndex, className, vehicles = [], focusedStop = null }) {
  const color = route.color ?? '#17171a'
  const active = route.directions[directionIndex]
  // El encuadre incluye los colectivos en vivo: si el feed usa un recorrido
  // distinto del que tiene el GTFS (ramales, ids nuevos), los colectivos
  // pueden estar fuera del trazado y quedaban afuera del mapa. Se recalcula
  // solo cuando aparecen o cambia el sentido, no en cada actualizacion.
  const hasVehicles = vehicles.length > 0
  const vehiclesRef = useRef(vehicles)
  vehiclesRef.current = vehicles
  const positions = useMemo(
    () => [...(active?.shape ?? []), ...(hasVehicles ? vehiclesRef.current.map((v) => [v.latitude, v.longitude]) : [])],
    [active, hasVehicles],
  )
  const markers = useRef([])
  const [zoom, setZoom] = useState(12)
  const busBadge = (
    <span className="map-card-bus" style={route.color ? { background: route.color } : undefined}>
      {route.shortName || '?'}
    </span>
  )
  const smallStops = zoom < SMALL_STOPS_ZOOM

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
            const isFocused = focusedStop?.index === index
            return (
              <CircleMarker
                key={`${stop.id}-${index}`}
                ref={(layer) => {
                  markers.current[index] = layer
                }}
                center={[stop.latitude, stop.longitude]}
                radius={isFocused ? 8 : isEnd ? 7 : smallStops ? 2.5 : 4}
                pathOptions={{
                  color,
                  fillColor: isFocused ? color : '#ffffff',
                  fillOpacity: 1,
                  weight: isFocused || isEnd ? 3 : smallStops ? 1.5 : 2,
                }}
              >
                <MapCard
                  badge={busBadge}
                  kicker={index === 0 ? 'Cabecera' : index === active.stops.length - 1 ? 'Última parada' : 'Parada'}
                  icon={<BusIcon kind="stop" color={route.color} />}
                  title={stopName(stop.name)}
                  subtitle={[
                    `Parada ${index + 1} de ${active.stops.length}`,
                    index > 0 && active.minutes?.[index] != null
                      ? `+${active.minutes[index]} min desde la cabecera`
                      : null,
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
          title={`Colectivo de la línea ${route.shortName || '?'}`}
          icon={badgeIcon('bus', { bg: '#f4c11b', fg: '#17171a', border: '#17171a', shape: 'square', size: 28 })}
        >
          <MapCard
            badge={busBadge}
            kicker={
              <>
                Colectivo en vivo <span className="live-dot" aria-hidden="true" />
              </>
            }
            icon={<BusIcon kind="bus" />}
            title={`Línea ${route.shortName || '?'}`}
            subtitle={[
              v.headsign ? `Hacia ${headsignName(v.headsign)}` : null,
              v.ageSeconds > 60 ? `posición de hace ${Math.round(v.ageSeconds / 60)} min` : 'posición actual',
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        </Marker>
      ))}

      <ZoomTracker onZoom={setZoom} />
      <FitToRoute positions={positions} />
      <FocusStop focused={focusedStop} stops={active?.stops} markers={markers} />
    </MapContainer>
  )
}
