import { Link } from 'react-router-dom'
import LineBadge from './LineBadge.jsx'
import FavoriteButton from './FavoriteButton.jsx'
import MiniNextTrains from './MiniNextTrains.jsx'
import { useApi } from '../hooks/useApi.js'
import { useFavorites } from '../hooks/useFavorites.js'
import { useFavoriteStations } from '../hooks/useFavoriteStations.js'
import { statusFor, worstAlertType } from '../utils/network.js'
import './MyLines.css'

/**
 * Seccion "Mis lineas" del inicio: las favoritas con su estado actual.
 * En las de subte se puede elegir una estacion para ver sus proximos trenes.
 */
export default function MyLines({ lines, alerts }) {
  const { favorites } = useFavorites()
  const { stations: chosen, setStation } = useFavoriteStations()
  const lineById = new Map(lines.map((line) => [line.id, line]))
  const myLines = favorites.map((id) => lineById.get(id)).filter(Boolean)
  const hasSubte = myLines.some((line) => line.mode === 'SUBTE')
  const { data: subteStations } = useApi(hasSubte ? '/api/v1/map/stations?mode=SUBTE' : null)

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
            const options = (subteStations ?? [])
              .filter((s) => s.lineId === line.id)
              .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
            const station = chosen[line.id]
            return (
              <div key={line.id} className="my-line-card">
                <div className="my-line">
                  <Link to={`/lineas/${line.id}`} className="my-line-link">
                    <LineBadge line={line} size="md" />
                    <span className="my-line-name">{line.name}</span>
                  </Link>
                  <span className={`status-pill ${status.className}`}>
                    <span className="dot"></span>
                    {status.label}
                  </span>
                  <FavoriteButton lineId={line.id} lineName={line.name} compact />
                </div>

                {line.mode === 'SUBTE' && options.length > 0 && (
                  <div className="my-line-trains">
                    <select
                      aria-label={`Estación de la ${line.name} para ver los próximos trenes`}
                      value={station ?? ''}
                      onChange={(event) => setStation(line.id, event.target.value)}
                    >
                      <option value="">Elegí tu estación…</option>
                      {options.map((s) => (
                        <option key={s.stationId} value={s.stationName}>
                          {s.stationName}
                        </option>
                      ))}
                    </select>
                    {station && <MiniNextTrains lineCode={line.code} stationName={station} />}
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
