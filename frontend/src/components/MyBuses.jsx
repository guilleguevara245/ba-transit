import { Link } from 'react-router-dom'
import Chevrons from './Chevrons.jsx'
import FavoriteButton from './FavoriteButton.jsx'
import { useApi } from '../hooks/useApi.js'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { alertsForBus, busTitle, movingLabel } from '../utils/busNames.js'
import './MyLines.css'

const COUNTS_REFRESH_MS = 60_000
const ALERTS_REFRESH_MS = 5 * 60_000

/**
 * "Mis colectivos" del inicio: cada linea favorita con cuantos colectivos
 * se mueven ahora, si tiene avisos y un acceso al mapa en vivo.
 * inPanel: solo los renglones, para el panel "Tus favoritos".
 */
export default function MyBuses({ inPanel = false }) {
  const { ids } = useFavoriteList('colectivos')
  const counts = useApi(ids.length > 0 ? `/api/v1/colectivos/vivo/lineas?lineas=${ids.join(',')}` : null, {
    refreshMs: COUNTS_REFRESH_MS,
  })
  const alerts = useApi(ids.length > 0 ? '/api/v1/colectivos/alertas' : null, { refreshMs: ALERTS_REFRESH_MS })
  if (ids.length === 0) return null

  const countOf = (line) =>
    counts.data?.available ? (counts.data.lines.find((l) => l.line === line)?.moving ?? 0) : null

  const cards = ids.map((line) => {
    const title = busTitle({ shortName: line })
    const moving = countOf(line)
    const lineAlerts = alertsForBus(alerts.data?.alerts, line)
    const href = `/colectivos?linea=${encodeURIComponent(line)}`
    const live = (
      <Link to={href} className="my-bus-live chevrons-host">
        Ver en vivo <Chevrons />
      </Link>
    )
    return (
      <div key={line} className="my-line-card">
        <div className="my-line">
          {inPanel && <span className="fav-kind">Colectivo</span>}
          <Link to={href} className="my-line-link">
            <span className="my-bus-number">{line}</span>
            <span className="my-place-text">
              <span className="my-line-name">{title}</span>
              {moving != null && (
                <small className={moving > 0 ? 'my-bus-moving' : undefined}>
                  {moving > 0 && <i className="live-dot" aria-hidden="true" />}
                  {movingLabel(moving)}
                </small>
              )}
            </span>
          </Link>
          {lineAlerts.length > 0 && (
            <span className="status-pill status-delayed" title={lineAlerts[0].title || undefined}>
              <span className="dot"></span>
              {lineAlerts.length === 1 ? 'Con aviso' : `${lineAlerts.length} avisos`}
            </span>
          )}
          {inPanel && live}
          <FavoriteButton kind="colectivos" id={line} name={title} compact />
        </div>
        {!inPanel && live}
      </div>
    )
  })

  if (inPanel) return <>{cards}</>

  return (
    <section className="my-lines" aria-label="Mis colectivos">
      <div className="section-label">Mis colectivos</div>
      <div className="my-lines-row">{cards}</div>
    </section>
  )
}
