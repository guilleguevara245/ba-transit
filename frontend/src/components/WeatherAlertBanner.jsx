import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { ALERT_LEVELS, alertTitle, periodText } from '../utils/weatherAlerts.js'
import './WeatherAlertBanner.css'

const REFRESH_MS = 10 * 60_000
const STORAGE_KEY = 'ba-transit:alertas-clima-cerradas'

function readDismissed() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

/**
 * Franja con las alertas meteorologicas del SMN vigentes para el AMBA
 * (tormentas, lluvias, calor, viento). Solo aparece cuando hay alguna;
 * cada una se puede cerrar y no vuelve a mostrarse (si cambia de nivel
 * llega con otro id y se ve de nuevo).
 */
export default function WeatherAlertBanner() {
  const { data } = useApi('/api/v1/clima/alertas', { refreshMs: REFRESH_MS })
  const [dismissed, setDismissed] = useState(readDismissed)
  const [open, setOpen] = useState(null)

  const alerts = (data?.alerts ?? []).filter((a) => !dismissed.includes(a.id))
  if (alerts.length === 0) return null

  function dismiss(id) {
    // Se guardan solo los ultimos 30 ids para no acumular para siempre.
    const next = [...dismissed, id].slice(-30)
    setDismissed(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Sin almacenamiento (modo privado): se cierra solo por esta visita.
    }
  }

  return (
    <div className="weather-alerts" role="region" aria-label="Alertas meteorológicas">
      {alerts.map((alert) => {
        const level = ALERT_LEVELS[alert.level] ?? ALERT_LEVELS.AMARILLA
        const expanded = open === alert.id
        return (
          <div key={alert.id} className={`weather-alert ${level.className}`}>
            <div className="wrap weather-alert-row">
              <span className="weather-alert-tag">{level.tag}</span>
              <div className="weather-alert-text">
                <strong>{alertTitle(alert, false)}</strong>
                <span>
                  {' '}
                  en el AMBA{periodText(alert) ? ` · ${periodText(alert)}` : ''} · SMN
                </span>
                {expanded && (
                  <div className="weather-alert-detail">
                    {alert.description && <p>{alert.description}</p>}
                    {alert.instruction && <p className="weather-alert-instruction">{alert.instruction}</p>}
                    {alert.areas?.length > 0 && <p className="weather-alert-areas">Zonas: {alert.areas.join(', ')}</p>}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="weather-alert-more"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : alert.id)}
              >
                {expanded ? 'Menos' : 'Detalles'}
              </button>
              <button
                type="button"
                className="weather-alert-close"
                aria-label={`Cerrar ${alertTitle(alert).toLowerCase()}`}
                onClick={() => dismiss(alert.id)}
              >
                ×
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
