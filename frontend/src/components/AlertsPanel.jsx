import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Chevrons from './Chevrons.jsx'
import './AlertsPanel.css'
import { formatRelativeTime } from '../utils/format.js'
import { ALERT_TYPE_LABELS } from '../constants.js'
import { ALERT_FILTERS, DEFAULT_VISIBLE, countByFilter, filterAlerts, sortByRecent } from '../utils/alertFilters.js'
import { linePath } from '../utils/lineSlug.js'

/**
 * Alertas activas, de la mas reciente a la mas vieja. Con lineas de mas
 * de un modo (pagina de inicio) se pueden filtrar por trenes, subtes o
 * premetro; se muestran las 5 mas recientes y el resto con "Ver todas".
 */
export default function AlertsPanel({ alerts, lines }) {
  const lineById = useMemo(() => new Map(lines.map((line) => [line.id, line])), [lines])
  const [filter, setFilter] = useState('TODAS')
  const [expanded, setExpanded] = useState(false)

  const modeOf = (alert) => lineById.get(alert.transportLineId)?.mode
  const showFilters = new Set(lines.map((line) => line.mode)).size > 1
  const counts = countByFilter(alerts, modeOf)
  const filtered = sortByRecent(filterAlerts(alerts, showFilters ? filter : 'TODAS', modeOf))
  const visible = expanded ? filtered : filtered.slice(0, DEFAULT_VISIBLE)
  const hidden = filtered.length - visible.length

  function choose(key) {
    setFilter(key)
    setExpanded(false)
  }

  return (
    <div className="panel">
      <div className="panel-title alerts-head">
        <span>Alertas destacadas</span>
        {showFilters ? (
          <div className="alert-filters" role="group" aria-label="Filtrar alertas">
            {ALERT_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={f.key === filter ? 'alert-filter active' : 'alert-filter'}
                aria-pressed={f.key === filter}
                disabled={counts[f.key] === 0 && f.key !== filter}
                onClick={() => choose(f.key)}
              >
                {f.label} <span className="alert-filter-count">{counts[f.key]}</span>
              </button>
            ))}
          </div>
        ) : (
          <span className="count">{alerts.length} activas</span>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="loading-text">
          {alerts.length === 0 ? 'No hay alertas activas por el momento.' : 'No hay alertas activas en este filtro.'}
        </div>
      )}

      {visible.map((alert) => {
        const line = lineById.get(alert.transportLineId)
        return (
          <div className="alert-item" key={alert.id}>
            <div className="alert-top">
              <span className={`alert-tag alert-tag-${alert.type.toLowerCase()}`}>
                {ALERT_TYPE_LABELS[alert.type] ?? alert.type}
              </span>
              <Link className="alert-line" to={linePath(line ?? { id: alert.transportLineId })}>
                {line ? line.name : `Línea #${alert.transportLineId}`}
              </Link>
            </div>
            <div className="alert-desc">{alert.description}</div>
            <div className="alert-meta">
              {formatRelativeTime(alert.publishedAt)} · Fuente: {alert.source}
            </div>
          </div>
        )
      })}

      {(hidden > 0 || expanded) && filtered.length > DEFAULT_VISIBLE && (
        <button type="button" className="alerts-more chevrons-host" onClick={() => setExpanded((value) => !value)}>
          {expanded ? (
            'Ver menos'
          ) : (
            <>
              Ver las {filtered.length} <Chevrons />
            </>
          )}
        </button>
      )}
    </div>
  )
}
