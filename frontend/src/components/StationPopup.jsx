import { Link } from 'react-router-dom'
import BothWays from './BothWays.jsx'
import AccessibleBadge from './AccessibleBadge.jsx'
import Chevrons from './Chevrons.jsx'
import LineBadge from './LineBadge.jsx'
import NextTrains from './NextTrains.jsx'
import StationIcon from './StationIcon.jsx'
import { findTransfers, routeInfo, shortOperator } from '../utils/map.js'
import { splitAlertsForStation } from '../utils/stationAlerts.js'
import { formatLongDate, yearsSince } from '../utils/format.js'
import './MapPopup.css'
import { stationPath } from '../utils/lineSlug.js'

const MAX_ALERT_CHARS = 110
/** Con mas estaciones que esto, el recorrido va sin un punto por estacion. */
const MAX_DOTS = 30

/** Iconos del estado de la estacion (trazo, 24x24). */
const STATUS_ICONS = {
  ok: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-4 9.5 2.7 2.7L16 9.8',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 8v5m0-8h.01',
  alert: 'M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0zM12 9.5v4m0 3h.01',
}

function asLine(station, mode) {
  return { mode, code: station.lineCode, name: station.lineName, colorHex: station.lineColorHex }
}

function StatusIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={STATUS_ICONS[name]} />
    </svg>
  )
}

/**
 * Mini recorrido de la linea: un punto por estacion, pintados hasta la
 * actual, que va resaltada. Si el ramal tiene muchas estaciones, solo la
 * barra y la estacion actual.
 */
function RouteTrack({ route, color }) {
  const last = route.total - 1
  const at = (route.position - 1) / last
  const left = (fraction) => `calc(4px + (100% - 8px) * ${fraction})`
  return (
    <div className="station-popup-route">
      <div className="station-popup-route-count">
        Estación {route.position} de {route.total}
      </div>
      <div className="station-popup-track" style={{ '--line-color': color }} aria-hidden="true">
        <span className="station-popup-rail" />
        <span className="station-popup-rail-done" style={{ width: `calc((100% - 8px) * ${at})` }} />
        {route.total <= MAX_DOTS &&
          Array.from({ length: route.total }, (_, i) =>
            i + 1 === route.position ? null : (
              <i key={i} className={i + 1 < route.position ? 'done' : ''} style={{ left: left(i / last) }} />
            ),
          )}
        <i className="here" style={{ left: left(at) }} />
      </div>
      <div className="station-popup-route-ends">
        <span>{route.from}</span>
        <span>{route.to}</span>
      </div>
    </div>
  )
}

function shorten(text) {
  return text.length > MAX_ALERT_CHARS ? `${text.slice(0, MAX_ALERT_CHARS).trimEnd()}…` : text
}

/**
 * Contenido del popup de una estacion en el mapa: linea y operadora,
 * posicion en el recorrido (mini recorrido), combinaciones con otras
 * lineas y estado de la estacion, con un enlace a la pagina de la estacion.
 */
export default function StationPopup({ station, stations, alerts, mode }) {
  const route = routeInfo(stations, station)
  const transfers = findTransfers(stations, station)
  const lineAlerts = alerts.filter((alert) => alert.transportLineId === station.lineId)
  // Una alerta que nombra una estacion ("Estacion Medrano cerrada") solo afecta a esa estacion.
  const lineNames = stations.filter((s) => s.lineId === station.lineId).map((s) => s.stationName)
  const split = splitAlertsForStation(lineAlerts, station, lineNames)
  const operator = shortOperator(station.lineOperator)

  return (
    <div className="station-popup">
      {/* Franja del color de la linea en el borde de arriba de la tarjeta. */}
      <span className="station-popup-stripe" style={{ background: station.lineColorHex }} aria-hidden="true" />

      {/* Linea y operadora. En subte y Premetro la letra ya nombra la linea
          ("Línea [B]"); en los trenes va el nombre. */}
      <div className="station-popup-line">
        {mode === 'SUBTE' || mode === 'PREMETRO' ? (
          <>
            Línea
            <LineBadge line={asLine(station, mode)} size="sm" />
          </>
        ) : (
          station.lineName
        )}
        {operator && (
          <>
            <span className="station-popup-dot">·</span>
            <span className="station-popup-operator">{operator}</span>
          </>
        )}
      </div>

      <h3 className="station-popup-name">
        <StationIcon color={station.lineColorHex} size={30} />
        {station.stationName}
      </h3>
      {station.accessible && <AccessibleBadge />}

      {route.total > 1 && route.position > 0 ? (
        <RouteTrack route={route} color={station.lineColorHex} />
      ) : (
        <div className="station-popup-route">
          {route.from}
          <BothWays />
          {route.to}
        </div>
      )}

      {station.openedOn && (
        <div className="station-popup-opened">
          Inaugurada el {formatLongDate(station.openedOn)}
          {yearsSince(station.openedOn) > 0 && ` · hace ${yearsSince(station.openedOn)} años`}
        </div>
      )}

      <NextTrains
        mode={mode}
        lineCode={station.lineCode}
        stationName={station.stationName}
        color={station.lineColorHex}
      />

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

      <div className="station-popup-section station-popup-status">
        {split.here.length > 0 ? (
          <div className="station-popup-state station-popup-state-here">
            <StatusIcon name="alert" />
            <div>
              <strong>Aviso en esta estación</strong>
              {shorten(split.here[0].description)}
            </div>
          </div>
        ) : split.line.length > 0 ? (
          <div className="station-popup-state station-popup-state-line">
            <StatusIcon name="alert" />
            <div>
              <strong>
                {split.line.length === 1 ? '1 alerta activa' : `${split.line.length} alertas activas`} en la línea
              </strong>
              {shorten(split.line[0].description)}
            </div>
          </div>
        ) : (
          <>
            <div className="station-popup-state station-popup-state-ok">
              <StatusIcon name="ok" />
              <span>Sin alertas en esta estación</span>
            </div>
            {split.elsewhere.length > 0 && (
              <div className="station-popup-state station-popup-state-note">
                <StatusIcon name="info" />
                <span>
                  {split.elsewhere.length === 1 ? '1 aviso' : `${split.elsewhere.length} avisos`} en otras estaciones de
                  la línea
                </span>
              </div>
            )}
          </>
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
