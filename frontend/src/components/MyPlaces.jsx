import { Link } from 'react-router-dom'
import LineBadge from './LineBadge.jsx'
import FavoriteButton from './FavoriteButton.jsx'
import NextTrains from './NextTrains.jsx'
import { hasTrainTimes } from '../utils/nextTrains.js'
import { useApi } from '../hooks/useApi.js'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { statusFor, worstAlertType } from '../utils/network.js'
import { stationPath } from '../utils/lineSlug.js'
import { trafficStatus, worstStatus } from '../utils/traffic.js'
import './MyLines.css'

/**
 * "Mis estaciones" del inicio: cada estacion favorita con el estado de su
 * linea y sus proximos trenes (subte, Premetro, Belgrano Norte y Urquiza:
 * las que tienen datos en vivo u horario). Solo aparece si hay alguna.
 * inPanel: solo los renglones, para el panel "Tus favoritos".
 */
export function MyStations({ lines, alerts, inPanel = false }) {
  const { ids } = useFavoriteList('estaciones')
  const { data: stations } = useApi(ids.length > 0 ? '/api/v1/map/stations' : null)
  if (ids.length === 0) return null

  const lineById = new Map(lines.map((line) => [line.id, line]))
  const mine = ids
    .map((id) => stations?.find((s) => s.stationId === id))
    .filter(Boolean)
    .map((station) => ({ station, line: lineById.get(station.lineId) }))
    .filter((item) => item.line)

  const cards = mine.map(({ station, line }) => {
    const status = statusFor(worstAlertType(alerts.filter((a) => a.transportLineId === line.id)))
    return (
      <div key={station.stationId} className="my-line-card">
        <div className="my-line">
          {inPanel && <span className="fav-kind">Estación</span>}
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
          <FavoriteButton kind="estaciones" id={station.stationId} name={`${station.stationName}, ${line.name}`} compact />
        </div>
        {hasTrainTimes(line.mode, line.code) && (
          <div className="my-line-trains">
            <NextTrains
              mode={line.mode}
              lineCode={line.code}
              stationName={station.stationName}
              color={line.colorHex}
              compact
            />
          </div>
        )}
      </div>
    )
  })
  const loading = !stations && <div className="my-lines-empty">Cargando tus estaciones…</div>

  if (inPanel) {
    return (
      <>
        {loading}
        {cards}
      </>
    )
  }

  return (
    <section className="my-lines" aria-label="Mis estaciones">
      <div className="section-label">Mis estaciones</div>
      {loading}
      {mine.length > 0 && <div className="my-lines-row">{cards}</div>}
    </section>
  )
}

/** "Mis accesos" del inicio: el estado del transito de cada acceso favorito. */
export function MyAccesses({ inPanel = false }) {
  const { ids } = useFavoriteList('accesos')
  const { data } = useApi(ids.length > 0 ? '/api/v1/accesos?resumen=true' : null, { refreshMs: 5 * 60_000 })
  if (ids.length === 0) return null

  const mine = ids.map((id) => data?.accesses.find((a) => a.id === id)).filter(Boolean)

  const cards = mine.map((access) => {
    const { label, color } = trafficStatus(data.configured ? worstStatus(access.segments) : 'SIN_DATOS')
    return (
      <div key={access.id} className="my-line-card">
        <div className="my-line">
          {inPanel && <span className="fav-kind">Acceso</span>}
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
  })
  const loading = !data && <div className="my-lines-empty">Cargando tus accesos…</div>

  if (inPanel) {
    return (
      <>
        {loading}
        {cards}
      </>
    )
  }

  return (
    <section className="my-lines" aria-label="Mis accesos">
      <div className="section-label">Mis accesos</div>
      {loading}
      {mine.length > 0 && <div className="my-lines-row">{cards}</div>}
    </section>
  )
}
