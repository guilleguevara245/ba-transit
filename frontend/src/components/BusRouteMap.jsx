import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { badgeIcon } from '../utils/mapIcons.js'
import BusIcon from './BusIcon.jsx'
import { DrawnPolyline, GlideMarker } from './GlideMarkers.jsx'
import { NextStop, PositionSource } from './LiveTrainCard.jsx'
import MapCard from './MapCard.jsx'
import { busTitle, headsignName, operatorName, stopName } from '../utils/busNames.js'
import { nextStop } from '../utils/busProgress.js'
import { secondsAgoText } from '../utils/liveTrains.js'

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
/** El amarillo de los colectivos del mapa (tambien el encabezado de sus tarjetas en el celular). */
const BUS_YELLOW = '#f4c11b'
/** Gris de los colectivos quietos fuera del recorrido (garage o terminal). */
const BUS_PARKED = '#cfccc4'
/** El colectivo andando: circulo amarillo con halo, como los trenes; quieto afuera: gris, chico y sin halo. */
const LIVE_ICON = badgeIcon('bus', { bg: BUS_YELLOW, fg: '#17171a', border: '#17171a', shape: 'circle', size: 32, pulse: true })
const PARKED_ICON = badgeIcon('bus', { bg: BUS_PARKED, fg: '#55534d', border: '#8a877f', shape: 'circle', size: 26 })

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
 * Tarjeta de un colectivo en vivo, como la del tren: el cartel de la
 * linea y la empresa, hacia donde va, la proxima parada con los minutos que le faltan
 * (si esta sobre el recorrido; si no, si esta detenido o puede ir por otro
 * ramal) y hace cuanto mando su posicion.
 */
function LiveBusCard({ route, vehicle, next, parked, badge }) {
  const agency = route.agency ? operatorName(route.agency) : null
  return (
    <MapCard
      color={parked ? BUS_PARKED : BUS_YELLOW}
      minWidth={240}
      badge={badge}
      // El cartel (303A) ya dice la linea: al lado, la empresa.
      kicker={agency ?? busTitle(route)}
      icon={<BusIcon kind="bus" />}
      title={
        parked
          ? 'Colectivo detenido'
          : vehicle.headsign
            ? `Hacia ${headsignName(vehicle.headsign)}`
            : 'Colectivo en servicio'
      }
    >
      {next ? (
        <NextStop label="Próxima parada" name={stopName(next.stop.name)} minutes={next.minutes} color={BUS_YELLOW} />
      ) : (
        <div className="live-train-service live-train-dim">
          {parked
            ? 'Quieto fuera del recorrido: en el garage o la terminal.'
            : 'Fuera del recorrido dibujado: puede ir por otro ramal o un desvío.'}
        </div>
      )}
      <PositionSource text="GPS del colectivo" age={secondsAgoText(vehicle.ageSeconds)} />
    </MapCard>
  )
}

/** Donde va cada colectivo sobre el recorrido de su sentido (null si esta fuera) y si esta quieto ahi afuera. */
function placeOf(route, vehicle, fallback) {
  // El feed usa el mismo direction_id que el GTFS; si no esta, el sentido elegido.
  const own = route.directions.find((d) => d.directionId === vehicle.direction) ?? fallback
  const next = nextStop(own, vehicle.latitude, vehicle.longitude, vehicle.ageSeconds ?? 0)
  return { next, parked: !next && vehicle.moving === false }
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
          {/* El recorrido se dibuja de punta a punta al abrirlo y al cambiar de sentido. */}
          <DrawnPolyline
            drawKey={`${route.id}-${directionIndex}`}
            positions={active.shape}
            pathOptions={{ color, weight: 5, opacity: 0.9 }}
          />
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
                  color={BUS_YELLOW}
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

      {/* Cada 30 segundos, cada colectivo se desliza a su nueva posicion. Un circulo con halo, como los trenes. */}
      {vehicles.map((v) => {
        const { next, parked } = placeOf(route, v, active)
        return (
          <GlideMarker
            key={v.id}
            position={[v.latitude, v.longitude]}
            title={parked ? 'Colectivo detenido fuera del recorrido' : `Colectivo de la línea ${route.shortName || '?'}`}
            zIndexOffset={parked ? -100 : 0}
            icon={parked ? PARKED_ICON : LIVE_ICON}
          >
            <LiveBusCard route={route} vehicle={v} next={next} parked={parked} badge={busBadge} />
          </GlideMarker>
        )
      })}

      <ZoomTracker onZoom={setZoom} />
      <FitToRoute positions={positions} />
      <FocusStop focused={focusedStop} stops={active?.stops} markers={markers} />
    </MapContainer>
  )
}
