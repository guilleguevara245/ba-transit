import { useEffect, useMemo, useRef } from 'react'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import StationPopup from './StationPopup.jsx'
import { buildRoutes } from '../utils/map.js'

// Centro aproximado de CABA, para cuando no hay estaciones que encuadrar.
const CENTER = [-34.6083, -58.4]
const ZOOM = 12
const FOCUS_ZOOM = 15

const toLatLng = (s) => [Number(s.latitude), Number(s.longitude)]

/** Encuadra el mapa para que entren todas las estaciones mostradas. */
function FitToStations({ positions, skip }) {
  const map = useMap()

  useEffect(() => {
    if (skip || positions.length === 0) return
    map.fitBounds(positions, { padding: [28, 28], maxZoom: 15 })
  }, [map, positions, skip])

  return null
}

/** Centra el mapa en la estacion enfocada y abre su popup. */
function FocusOnStation({ station, markers, openPopup }) {
  const map = useMap()

  useEffect(() => {
    if (!station) return
    // Sin animacion: si no, el popup se abre antes de que termine el
    // movimiento y el ajuste automatico lo deja cortado arriba.
    map.setView(toLatLng(station), Math.max(map.getZoom(), FOCUS_ZOOM), { animate: false })
    if (openPopup) markers.current[station.stationId]?.openPopup()
  }, [map, station, markers, openPopup])

  return null
}

/**
 * Mapa de estaciones con el recorrido de cada ramal. Lo usan la pagina
 * del mapa, la de cada modo y el minimapa del detalle de linea.
 *
 * - stations: estaciones a dibujar (con coordenadas).
 * - allStations: todas las estaciones conocidas, para calcular
 *   combinaciones en el popup (por defecto, las mismas).
 * - focusId: estacion a centrar y resaltar (y abrir su popup, salvo
 *   openFocusedPopup = false).
 * - onSelect: se llama con el id de la estacion al hacer click.
 */
export default function NetworkMap({
  stations,
  allStations = stations,
  alerts = [],
  focusId = null,
  openFocusedPopup = true,
  onSelect,
  className,
}) {
  const markers = useRef({})
  const routes = useMemo(() => buildRoutes(stations), [stations])
  const positions = useMemo(() => stations.map(toLatLng), [stations])
  const focused = stations.find((s) => s.stationId === focusId) ?? null

  return (
    <MapContainer center={CENTER} zoom={ZOOM} className={className} scrollWheelZoom>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {routes.map((route) => (
        <Polyline
          key={route.branchId}
          positions={route.positions}
          pathOptions={{ color: route.color, weight: 4, opacity: 0.8 }}
        />
      ))}

      {stations.map((station) => {
        const isFocused = station.stationId === focusId
        return (
          <CircleMarker
            key={station.stationId}
            ref={(layer) => {
              if (layer) markers.current[station.stationId] = layer
            }}
            center={toLatLng(station)}
            radius={isFocused ? 9 : 5.5}
            pathOptions={{
              color: isFocused ? '#17171a' : '#ffffff',
              fillColor: station.lineColorHex,
              fillOpacity: 1,
              weight: isFocused ? 3 : 1.5,
            }}
            eventHandlers={onSelect ? { click: () => onSelect(station.stationId) } : undefined}
          >
            <Popup className="station-popup-container" maxWidth={300} minWidth={240} autoPanPadding={[16, 16]}>
              <StationPopup station={station} stations={allStations} alerts={alerts} mode={station.lineMode} />
            </Popup>
          </CircleMarker>
        )
      })}

      <FitToStations positions={positions} skip={Boolean(focused)} />
      <FocusOnStation station={focused} markers={markers} openPopup={openFocusedPopup} />
    </MapContainer>
  )
}
