import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { useApi } from '../hooks/useApi.js'
import './MapPage.css'

// Centro aproximado de CABA.
const CENTER = [-34.6083, -58.4]
const ZOOM = 12

function buildLegend(stations) {
  const seen = new Map()
  for (const station of stations) {
    if (!seen.has(station.lineId)) {
      seen.set(station.lineId, { name: station.lineName, color: station.lineColorHex })
    }
  }
  return Array.from(seen.values())
}

export default function MapPage() {
  const { data: stations, loading, error } = useApi('/api/v1/map/stations')

  return (
    <div className="wrap content">
      <div className="section-label">Mapa de la red (subte)</div>

      {loading && <div className="loading-text">Cargando estaciones...</div>}
      {error && (
        <div className="error-text">
          No se pudo cargar el mapa ({error}). ¿Está corriendo el backend en localhost:8080?
        </div>
      )}

      {stations && (
        <>
          <div className="map-container">
            <MapContainer center={CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {stations.map((station) => (
                <CircleMarker
                  key={station.stationId}
                  center={[station.latitude, station.longitude]}
                  radius={6}
                  pathOptions={{
                    color: station.lineColorHex,
                    fillColor: station.lineColorHex,
                    fillOpacity: 0.9,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="map-popup">
                      <strong>{station.stationName}</strong>
                      {station.lineName}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
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
