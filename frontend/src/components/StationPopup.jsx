import { Link } from 'react-router-dom'
import BothWays from './BothWays.jsx'
import AccessibleBadge from './AccessibleBadge.jsx'
import Chevrons from './Chevrons.jsx'
import LineBadge from './LineBadge.jsx'
import NextTrains from './NextTrains.jsx'
import StationIcon from './StationIcon.jsx'
import { findTransfers, routeInfo } from '../utils/map.js'
import { splitAlertsForStation } from '../utils/stationAlerts.js'
import { formatLongDate, yearsSince } from '../utils/format.js'
import './MapPopup.css'
import { stationPath } from '../utils/lineSlug.js'

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
  // Una alerta que nombra una estacion ("Estacion Medrano cerrada") solo afecta a esa estacion.
  const lineNames = stations.filter((s) => s.lineId === station.lineId).map((s) => s.stationName)
  const split = splitAlertsForStation(lineAlerts, station, lineNames)

  return (
    <div className="station-popup">
      {/* Icono de estacion; la linea va al lado: en subte y Premetro la letra ya la nombra
          ("Línea [B]"), en los trenes el icono es igual para todas y va el nombre. */}
      <div className="station-popup-line">
        <StationIcon color={station.lineColorHex} size={26} />
        {mode === 'SUBTE' || mode === 'PREMETRO' ? 'Línea' : station.lineName}
        <LineBadge line={asLine(station, mode)} size="sm" />
      </div>

      <h3 className="station-popup-name">{station.stationName}</h3>
      {station.accessible && <AccessibleBadge />}

      <div className="station-popup-route">
        Estación {route.position} de {route.total} · {route.from}
        <BothWays />
        {route.to}
      </div>

      {station.openedOn && (
        <div className="station-popup-opened">
          Inaugurada el {formatLongDate(station.openedOn)}
          {yearsSince(station.openedOn) > 0 && ` · hace ${yearsSince(station.openedOn)} años`}
        </div>
      )}

      <NextTrains mode={mode} lineCode={station.lineCode} stationName={station.stationName} />

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
            {station.landmarks
              .split(';')
              .map((place) => place.trim())
              .filter(Boolean)
              .map((place) => (
                <li key={place}>{place}</li>
              ))}
          </ul>
        </div>
      )}

      <div className="station-popup-section">
        {split.here.length > 0 ? (
          <div className="station-popup-alert station-popup-alert-here">
            <strong>Aviso en esta estación</strong>
            {shorten(split.here[0].description)}
          </div>
        ) : split.line.length > 0 ? (
          <div className="station-popup-alert">
            <strong>
              {split.line.length === 1 ? '1 alerta activa' : `${split.line.length} alertas activas`} en la línea
            </strong>
            {shorten(split.line[0].description)}
          </div>
        ) : (
          <div className="station-popup-ok">
            Sin alertas en esta estación
            {split.elsewhere.length > 0 && (
              <span className="station-popup-elsewhere">
                {split.elsewhere.length === 1 ? '1 aviso' : `${split.elsewhere.length} avisos`} en otras estaciones de
                la línea
              </span>
            )}
          </div>
        )}
      </div>

      <div className="station-popup-links">
        <Link className="station-popup-link chevrons-host" to={stationPath(station)}>
          Ver la estación <Chevrons />
        </Link>
      </div>
    </div>
  )
}
