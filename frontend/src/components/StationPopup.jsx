import { Link } from 'react-router-dom'
import AccessibleBadge from './AccessibleBadge.jsx'
import Chevrons from './Chevrons.jsx'
import LineBadge from './LineBadge.jsx'
import NextTrains from './NextTrains.jsx'
import { findTransfers, routeInfo } from '../utils/map.js'
import { formatLongDate, yearsSince } from '../utils/format.js'

const MAX_ALERT_CHARS = 110

function asLine(station, mode) {
  return { mode, code: station.lineCode, name: station.lineName, colorHex: station.lineColorHex }
}

function shorten(text) {
  return text.length > MAX_ALERT_CHARS ? `${text.slice(0, MAX_ALERT_CHARS).trimEnd()}…` : text
}

/**
 * Contenido del popup de una estacion en el mapa: linea, posicion en el
 * recorrido, combinaciones con otras lineas y alertas activas de la
 * linea, con un enlace a la pagina de la linea.
 */
export default function StationPopup({ station, stations, alerts, mode }) {
  const route = routeInfo(stations, station)
  const transfers = findTransfers(stations, station)
  const lineAlerts = alerts.filter((alert) => alert.transportLineId === station.lineId)

  return (
    <div className="station-popup">
      <div className="station-popup-line">
        <LineBadge line={asLine(station, mode)} size="sm" />
        {station.lineName}
      </div>

      <h3 className="station-popup-name">{station.stationName}</h3>
      {station.accessible && <AccessibleBadge />}

      <div className="station-popup-route">
        Estación {route.position} de {route.total} · {route.from} ↔ {route.to}
      </div>

      {station.openedOn && (
        <div className="station-popup-opened">
          Inaugurada el {formatLongDate(station.openedOn)}
          {yearsSince(station.openedOn) > 0 && ` · hace ${yearsSince(station.openedOn)} años`}
        </div>
      )}

      {mode === 'SUBTE' && <NextTrains lineCode={station.lineCode} stationName={station.stationName} />}

      {transfers.length > 0 && (
        <div className="station-popup-section">
          <div className="station-popup-label">Combinación con</div>
          <ul className="station-popup-transfers">
            {transfers.map((t) => (
              <li key={t.lineId}>
                <LineBadge line={asLine(t, mode)} size="sm" />
                <span>{t.stationName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {station.landmarks && (
        <div className="station-popup-section">
          <div className="station-popup-label">Cerca</div>
          <ul className="station-popup-landmarks">
            {station.landmarks.split(';').map((place) => place.trim()).filter(Boolean).map((place) => (
              <li key={place}>{place}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="station-popup-section">
        {lineAlerts.length === 0 ? (
          <div className="station-popup-ok">Sin alertas en la línea</div>
        ) : (
          <div className="station-popup-alert">
            <strong>
              {lineAlerts.length === 1 ? '1 alerta activa' : `${lineAlerts.length} alertas activas`} en la línea
            </strong>
            {shorten(lineAlerts[0].description)}
          </div>
        )}
      </div>

      <div className="station-popup-links">
        <Link className="station-popup-link chevrons-host" to={`/estaciones/${station.stationId}`}>
          Ver la estación <Chevrons />
        </Link>
      </div>
    </div>
  )
}
