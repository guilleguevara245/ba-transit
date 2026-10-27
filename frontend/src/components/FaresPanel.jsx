import { Link } from 'react-router-dom'
import Chevrons from './Chevrons.jsx'
import './FaresPanel.css'
import { formatCurrency, formatLongDate } from '../utils/format.js'
import { fareSummary } from '../utils/fares.js'
import { STALE_TEXT, isStale } from '../utils/staleness.js'

/**
 * Resumen de tarifas: una fila por modo con el precio base (SUBE
 * registrada). El cuadro completo, por tramo y jurisdiccion, esta en /sube.
 */
export default function FaresPanel({ fares, showMore = true }) {
  const summary = fareSummary(fares)
  const since = fares?.map((f) => f.effectiveFrom).filter(Boolean).sort().at(-1)

  return (
    <div className="panel side-panel">
      <div className="panel-title">Tarifas vigentes</div>

      {summary.length === 0 && <div className="loading-text">Todavía no hay tarifas cargadas.</div>}

      {summary.map((row) => (
        <div className="fare-row" key={row.mode}>
          <span className="name">
            {row.label}
            {row.hint && <small>{row.hint}</small>}
          </span>
          <span className="value">
            {row.from && <small>desde</small>}
            {formatCurrency(row.price)}
          </span>
        </div>
      ))}

      {summary.length > 0 && (
        <p className="fares-note">
          Con SUBE registrada. Sin registrar cuesta más.
          {since && ` Vigentes desde el ${formatLongDate(since)}.`}
          {isStale('tarifas') && <span className="stale-note"> {STALE_TEXT}</span>}
        </p>
      )}

      {showMore && (
        <Link className="fares-more chevrons-host" to="/sube#tarifas">
          Cuadro completo y descuento Red SUBE <Chevrons />
        </Link>
      )}
    </div>
  )
}
