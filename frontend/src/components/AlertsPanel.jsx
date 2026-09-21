import './AlertsPanel.css'
import { formatRelativeTime } from '../utils/format.js'

const TYPE_LABELS = {
  OBRA: 'Obra',
  DEMORA: 'Demora',
  INTERRUPCION: 'Interrupción',
  DESVIO: 'Desvío',
}

export default function AlertsPanel({ alerts, lines }) {
  const lineById = new Map(lines.map((line) => [line.id, line]))

  return (
    <div className="panel">
      <div className="panel-title">
        Alertas destacadas <span className="count">{alerts.length} activas</span>
      </div>

      {alerts.length === 0 && <div className="loading-text">No hay alertas activas por el momento.</div>}

      {alerts.map((alert) => {
        const line = lineById.get(alert.transportLineId)
        return (
          <div className="alert-item" key={alert.id}>
            <div className="alert-top">
              <span className={`alert-tag alert-tag-${alert.type.toLowerCase()}`}>
                {TYPE_LABELS[alert.type] ?? alert.type}
              </span>
              <span className="alert-line">{line ? line.name : `Línea #${alert.transportLineId}`}</span>
            </div>
            <div className="alert-desc">{alert.description}</div>
            <div className="alert-meta">
              {formatRelativeTime(alert.publishedAt)} · Fuente: {alert.source}
            </div>
          </div>
        )
      })}
    </div>
  )
}
