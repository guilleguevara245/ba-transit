import { useEffect, useMemo, useRef, useState } from 'react'
import { divIcon } from 'leaflet'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import StationPopup from './StationPopup.jsx'
import { buildRoutes } from '../utils/map.js'
import { mentionsStation } from '../utils/stationAlerts.js'
import './NetworkMap.css'

// Centro aproximado de CABA, para cuando no hay estaciones que encuadrar.
const CENTER = [-34.6083, -58.4]
const ZOOM = 12
const FOCUS_ZOOM = 15
/**
 * Con el mapa mas lejos que esto, las estaciones con aviso van como un
 * punto con borde naranja (o rojo si estan cerradas) en lugar del
 * triangulo: muchos triangulos juntos tapaban el centro del mapa.
 */
const WARNING_ICON_ZOOM = 13

const toLatLng = (s) => [Number(s.latitude), Number(s.longitude)]

/**
 * Senal de precaucion (triangulo amarillo con "!") que reemplaza al punto
 * de las estaciones con un aviso propio. Mas grande si esta enfocada.
 */
const warningIcon = (focused) => {
  const size = focused ? 28 : 22
  return divIcon({
    className: focused ? 'station-warning focused' : 'station-warning',
    html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 1.5 21h21L12 2.5z"/><path class="mark" d="M12 9v5.5M12 17.6v.1"/></svg>',
    iconSize: [size, size],
    // Centrado en la estacion, como el punto al que reemplaza.
    iconAnchor: [size / 2, size * 0.62],
    popupAnchor: [0, -size * 0.55],
  })
}

/**
 * Estaciones nombradas en alertas de su linea ("Estacion Medrano
 * cerrada"): { [stationId]: { closed, text } }.
 */
function stationNotices(stations, alerts) {
  const notices = {}
  if (!alerts?.length) return notices
  for (const station of stations) {
    const alert = alerts.find(
      (a) =>
        a.transportLineId === station.lineId &&
        mentionsStation(`${a.title ?? ''} ${a.description ?? ''}`, station.stationName),
    )
    if (alert) notices[station.stationId] = { closed: /cerrad/i.test(alert.description ?? ''), text: alert.description }
  }
  return notices
}

/** Avisa el zoom actual cada vez que cambia. */
function ZoomTracker({ onZoom }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  useEffect(() => onZoom(map.getZoom()), [map, onZoom])
  return null
}

/** Encuadra el mapa para que entren todas las estaciones mostradas. */
function FitToStations({ positions, skip }) {
  const map = useMap()

  useEffect(() => {
    if (skip || positions.length === 0) return
    map.fitBounds(positions, { padding: [28, 28], maxZoom: 15 })
  }, [map, positions, skip])

  return null
}

/**
 * La tarjeta de una estacion crece despues de abrirse (llegan los proximos
 * trenes) y el ajuste automatico de Leaflet solo corre al abrir: sin esto
 * la parte de arriba quedaba cortada en mapas bajos como el minimapa.
 */
function KeepPopupInView() {
  const map = useMap()

  useEffect(() => {
    let observer = null
    let frame = 0
    function onOpen(event) {
      observer?.disconnect()
      const content = event.popup.getElement()?.querySelector('.leaflet-popup-content')
      if (!content || typeof window.ResizeObserver === 'undefined') return
      let lastHeight = content.offsetHeight
      observer = new window.ResizeObserver(() => {
        if (content.offsetHeight === lastHeight) return
        lastHeight = content.offsetHeight
        window.cancelAnimationFrame(frame)
        frame = window.requestAnimationFrame(() => event.popup.isOpen() && event.popup.update())
      })
      observer.observe(content)
    }
    function onClose() {
      observer?.disconnect()
      observer = null
    }
    map.on('popupopen', onOpen)
    map.on('popupclose', onClose)
    return () => {
      map.off('popupopen', onOpen)
      map.off('popupclose', onClose)
      onClose()
      window.cancelAnimationFrame(frame)
    }
  }, [map])

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
 * - routeStations: estaciones con las que se dibujan los recorridos (por
 *   defecto, las mismas; sirve para mostrar solo algunas estaciones sin
 *   cortar las lineas).
 * - allStations: todas las estaciones conocidas, para calcular
 *   combinaciones en el popup (por defecto, las mismas).
 * - focusId: estacion a centrar y resaltar (y abrir su popup, salvo
 *   openFocusedPopup = false).
 * - onSelect: se llama con el id de la estacion al hacer click.
 */
export default function NetworkMap({
  stations,
  routeStations = stations,
  allStations = stations,
  alerts = [],
  focusId = null,
  openFocusedPopup = true,
  onSelect,
  className,
}) {
  const markers = useRef({})
  const routes = useMemo(() => buildRoutes(routeStations), [routeStations])
  const positions = useMemo(() => stations.map(toLatLng), [stations])
  const focused = stations.find((s) => s.stationId === focusId) ?? null
  const notices = useMemo(() => stationNotices(stations, alerts), [stations, alerts])
  const [zoom, setZoom] = useState(ZOOM)

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
        const notice = notices[station.stationId]
        const ref = (layer) => {
          if (layer) markers.current[station.stationId] = layer
        }
        const handlers = onSelect ? { click: () => onSelect(station.stationId) } : undefined
        const popup = (
          <Popup className="station-popup-container" maxWidth={300} minWidth={240} autoPanPadding={[16, 16]}>
            <StationPopup station={station} stations={allStations} alerts={alerts} mode={station.lineMode} />
          </Popup>
        )
        // Estacion con aviso propio (por ejemplo, cerrada): la senal de precaucion en lugar del punto
        // (de lejos, el punto con borde naranja o rojo).
        if (notice && (zoom >= WARNING_ICON_ZOOM || isFocused)) {
          return (
            <Marker
              key={station.stationId}
              ref={ref}
              position={toLatLng(station)}
              icon={warningIcon(isFocused)}
              title={notice.text}
              alt={notice.closed ? 'Estación cerrada' : 'Aviso en la estación'}
              zIndexOffset={1000}
              eventHandlers={handlers}
            >
              {popup}
            </Marker>
          )
        }
        const ring = notice ? (notice.closed ? '#d62828' : '#f07314') : null
        return (
          <CircleMarker
            key={station.stationId}
            ref={ref}
            center={toLatLng(station)}
            radius={isFocused ? 9 : ring ? 6.5 : 5.5}
            pathOptions={{
              color: isFocused ? '#17171a' : (ring ?? '#ffffff'),
              fillColor: station.lineColorHex,
              fillOpacity: 1,
              weight: isFocused || ring ? 3 : 1.5,
            }}
            eventHandlers={handlers}
          >
            {popup}
          </CircleMarker>
        )
      })}

      <ZoomTracker onZoom={setZoom} />
      <FitToStations positions={positions} skip={Boolean(focused)} />
      <FocusOnStation station={focused} markers={markers} openPopup={openFocusedPopup} />
      <KeepPopupInView />
    </MapContainer>
  )
}
