import { Link } from 'react-router-dom'
import LineBadge from './LineBadge.jsx'
import FavoriteButton from './FavoriteButton.jsx'
import { useFavorites } from '../hooks/useFavorites.js'
import { statusFor, worstAlertType } from '../utils/network.js'
import './MyLines.css'

/** Seccion "Mis lineas" del inicio: las favoritas con su estado actual. */
export default function MyLines({ lines, alerts }) {
  const { favorites } = useFavorites()
  const lineById = new Map(lines.map((line) => [line.id, line]))
  const myLines = favorites.map((id) => lineById.get(id)).filter(Boolean)

  return (
    <section className="my-lines" aria-label="Mis líneas">
      <div className="section-label">Mis líneas</div>

      {myLines.length === 0 ? (
        <div className="my-lines-empty">
          Tocá la <span className="star">★</span> en cualquier línea para seguir su estado desde acá.
          Se guardan en este navegador.
        </div>
      ) : (
        <div className="my-lines-row">
          {myLines.map((line) => {
            const lineAlerts = alerts.filter((a) => a.transportLineId === line.id)
            const status = statusFor(worstAlertType(lineAlerts))
            return (
              <Link key={line.id} to={`/lineas/${line.id}`} className="my-line">
                <LineBadge line={line} size="md" />
                <span className="my-line-name">{line.name}</span>
                <span className={`status-pill ${status.className}`}>
                  <span className="dot"></span>
                  {status.label}
                </span>
                <FavoriteButton lineId={line.id} lineName={line.name} compact />
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
