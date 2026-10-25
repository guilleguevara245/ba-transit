import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { useApi } from '../hooks/useApi.js'
import { buildLegend, buildRoutes } from '../utils/map.js'
import './MapPage.css'

// Centro aproximado de CABA.
const CENTER = [-34.6083, -58.4]
const ZOOM = 12
const FOCUS_ZOOM = 16

/**
 * Centra el mapa en la estacion pedida por URL (/mapa?estacion=ID) y
 * abre su popup. Tiene que vivir dentro de MapContainer para usar useMap.
 */
function FocusOnStation({ station, markerRef }) {
  const map = useMap()

  useEffect(() => {
    if (!station) return
    map.setView([Number(station.latitude), Number(station.longitude)], FOCUS_ZOOM)
    markerRef.current?.openPopup()
  }, [map, station, markerRef])

  return null
}

export default function MapPage() {
  const { data: stations, loading, error } = useApi('/api/v1/map/stations')
  const [searchParams] = useSearchParams()
  const focusedMarkerRef = useRef(null)

  const focusedId = Number(searchParams.get('estacion')) || null
  const focusedStation = stations?.find((s) => s.stationId === focusedId) ?? null
  const routes = useMemo(() => (stations ? buildRoutes(stations) : []), [stations])

  return (
    <div className="wrap content">
      <div className="section-label">Mapa de la red (subte)</div>

      {loading && <div className="loading-text">Cargando estaciones...</div>}
      {error && <ErrorMessage what="el mapa" error={error} />}
      {focusedId && stations && !focusedStation && (
        <div className="stale-text">Esa estación todavía no tiene ubicación cargada en el mapa.</div>
      )}

      {stations && (
        <>
          <div className="map-container">
            <MapContainer center={CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {routes.map((route) => (
                <Polyline
                  key={route.branchId}
                  positions={route.positions}
                  pathOptions={{ color: route.color, weight: 4, opacity: 0.75 }}
                />
              ))}

              {stations.map((station) => {
                const focused = station.stationId === focusedId
                return (
                  <CircleMarker
                    key={station.stationId}
                    ref={focused ? focusedMarkerRef : undefined}
                    center={[Number(station.latitude), Number(station.longitude)]}
                    radius={focused ? 9 : 6}
                    pathOptions={{
                      color: focused ? '#ffffff' : station.lineColorHex,
                      fillColor: station.lineColorHex,
                      fillOpacity: 0.95,
                      weight: focused ? 3 : 2,
                    }}
                  >
                    <Popup>
                      <div className="map-popup">
                        <strong>{station.stationName}</strong>
                        {station.lineName}
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}

              <FocusOnStation station={focusedStation} markerRef={focusedMarkerRef} />
            </MapContainer>
          </div>

          <div className="map-legend">
            {buildLegend(stations).map((line) => (
              <div className="map-legend-item" key={line.name}>
                <span className="map-legend-dot" style={{ background: line.color }}></span>
                {line.name}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
