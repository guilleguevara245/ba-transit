import { useApi } from '../hooks/useApi.js'
import { ALERT_TYPE_LABELS } from '../constants.js'
import './StatsPage.css'

export default function StatsPage() {
  const { data: stats, loading, error } = useApi('/api/v1/stats/alerts')

  const maxTotal = stats ? Math.max(...stats.map((s) => s.totalAlerts), 1) : 1

  return (
    <div className="wrap content">
      <div className="section-label">Alertas históricas por línea</div>

      {loading && <div className="loading-text">Cargando estadísticas...</div>}
      {error && (
        <div className="error-text">
          No se pudo cargar las estadísticas ({error}). ¿Está corriendo el backend en localhost:8080?
        </div>
      )}

      {stats && stats.length === 0 && (
        <div className="loading-text">Todavía no hay alertas registradas para mostrar estadísticas.</div>
      )}

      {stats && stats.length > 0 && (
        <div className="stats-list">
          {stats.map((line) => {
            const widthPercent = Math.round((line.totalAlerts / maxTotal) * 100)
            return (
              <div className="stats-row-wrapper" key={line.lineId}>
                <div className="stats-row">
                  <span className="stats-line-name">{line.lineName}</span>
                  <div className="stats-bar-track">
                    <div
                      className="stats-bar-fill"
                      style={{ width: `${widthPercent}%`, background: line.lineColorHex }}
                    ></div>
                  </div>
                  <span className="stats-count">{line.totalAlerts} total</span>
                </div>
                <div className="stats-meta">
                  {line.activeAlerts} {line.activeAlerts === 1 ? 'activa' : 'activas'}
                  {line.mostCommonType &&
                    ` · tipo más común: ${ALERT_TYPE_LABELS[line.mostCommonType] ?? line.mostCommonType}`}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
