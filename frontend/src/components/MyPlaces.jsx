import { Link } from 'react-router-dom'
import LineBadge from './LineBadge.jsx'
import FavoriteButton from './FavoriteButton.jsx'
import MiniNextTrains from './MiniNextTrains.jsx'
import { useApi } from '../hooks/useApi.js'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { statusFor, worstAlertType } from '../utils/network.js'
import { stationPath } from '../utils/lineSlug.js'
import { trafficStatus, worstStatus } from '../utils/traffic.js'
import './MyLines.css'

/**
 * "Mis estaciones" del inicio: cada estacion favorita con el estado de su
 * linea y, en el subte, los proximos trenes. Solo aparece si hay alguna.
 */
export function MyStations({ lines, alerts }) {
  const { ids } = useFavoriteList('estaciones')
  const { data: stations } = useApi(ids.length > 0 ? '/api/v1/map/stations' : null)
  if (ids.length === 0) return null

  const lineById = new Map(lines.map((line) => [line.id, line]))
  const mine = ids
    .map((id) => stations?.find((s) => s.stationId === id))
    .filter(Boolean)
    .map((station) => ({ station, line: lineById.get(station.lineId) }))
    .filter((item) => item.line)

  return (
    <section className="my-lines" aria-label="Mis estaciones">
      <div className="section-label">Mis estaciones</div>
      {!stations && <div className="my-lines-empty">Cargando tus estaciones…</div>}
      {mine.length > 0 && (
        <div className="my-lines-row">
          {mine.map(({ station, line }) => {
            const status = statusFor(worstAlertType(alerts.filter((a) => a.transportLineId === line.id)))
            return (
              <div key={station.stationId} className="my-line-card">
                <div className="my-line">
                  <Link to={stationPath(station)} className="my-line-link">
                    <LineBadge line={line} size="md" />
                    <span className="my-place-text">
                      <span className="my-line-name">{station.stationName}</span>
                      <small>{line.name}</small>
                    </span>
                  </Link>
                  <span className={`status-pill ${status.className}`}>
                    <span className="dot"></span>
                    {status.label}
                  </span>
                  <FavoriteButton
                    kind="estaciones"
                    id={station.stationId}
                    name={`${station.stationName}, ${line.name}`}
                    compact
                  />
                </div>
                {line.mode === 'SUBTE' && (
                  <div className="my-line-trains">
                    <MiniNextTrains lineCode={line.code} stationName={station.stationName} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** "Mis accesos" del inicio: el estado del transito de cada acceso favorito. */
export function MyAccesses() {
  const { ids } = useFavoriteList('accesos')
  const { data } = useApi(ids.length > 0 ? '/api/v1/accesos?resumen=true' : null, { refreshMs: 5 * 60_000 })
  if (ids.length === 0) return null

  const mine = ids.map((id) => data?.accesses.find((a) => a.id === id)).filter(Boolean)

  return (
    <section className="my-lines" aria-label="Mis accesos">
      <div className="section-label">Mis accesos</div>
      {!data && <div className="my-lines-empty">Cargando tus accesos…</div>}
      {mine.length > 0 && (
        <div className="my-lines-row">
          {mine.map((access) => {
            const { label, color } = trafficStatus(data.configured ? worstStatus(access.segments) : 'SIN_DATOS')
            return (
              <div key={access.id} className="my-line-card">
                <div className="my-line">
                  <Link to="/accesos" className="my-line-link">
                    <span className="my-place-road">{access.road}</span>
                    <span className="my-place-text">
                      <span className="my-line-name">{access.name}</span>
                      <small>{access.connects}</small>
                    </span>
                  </Link>
                  <span className="my-place-traffic" style={{ '--status-color': color }}>
                    <i />
                    {label}
                  </span>
                  <FavoriteButton kind="accesos" id={access.id} name={access.name} compact />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
