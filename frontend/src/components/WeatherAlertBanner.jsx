import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApi } from '../hooks/useApi.js'
import WeatherIcon from './WeatherIcon.jsx'
import { ALERT_ICONS, ALERT_LEVELS, alertTitle, dismissKey, periodText, travelTip } from '../utils/weatherAlerts.js'
import './WeatherAlertBanner.css'

const REFRESH_MS = 10 * 60_000
const STORAGE_KEY = 'ba-transit:alertas-clima-cerradas'
// Pantallas donde la alerta no aporta (ingresar, cuenta, avisos, legales): ahi distrae.
const HIDDEN_ON = [
  '/ingresar',
  '/cuenta',
  '/recuperar',
  '/restablecer',
  '/notificaciones',
  '/mis-lugares',
  '/privacidad',
  '/condiciones',
]

// Las alertas que ya bajaron con la animacion en esta visita (no se repite al cambiar de pagina).
const shown = new Set()

function readDismissed() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

/**
 * Franja con las alertas meteorologicas del SMN vigentes para el AMBA
 * (tormentas, lluvias y calor), en una linea: tipo, cuando y un consejo
 * para viajar (sin el texto largo del SMN). Solo aparece cuando hay alguna,
 * apareciendo con un barrido desde la raya de color la primera vez. Cerrada, no vuelve en el dia
 * aunque el SMN la renueve; vuelve si sube de nivel (ver dismissKey).
 */
export default function WeatherAlertBanner() {
  const { pathname } = useLocation()
  const { data } = useApi('/api/v1/clima/alertas', { refreshMs: REFRESH_MS })
  const [dismissed, setDismissed] = useState(readDismissed)

  const alerts = (data?.alerts ?? []).filter((a) => !dismissed.includes(dismissKey(a)))
  if (alerts.length === 0 || HIDDEN_ON.includes(pathname)) return null

  function dismiss(alert) {
    // Se guardan solo las ultimas 30 para no acumular para siempre.
    const next = [...dismissed, dismissKey(alert)].slice(-30)
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
        const key = dismissKey(alert)
        const enter = !shown.has(key)
        shown.add(key)
        return (
          <div key={alert.id} className={`weather-alert ${level.className}${enter ? ' weather-alert-enter' : ''}`}>
            <div className="weather-alert-inner">
              <div className="wrap weather-alert-row">
                <WeatherIcon kind={ALERT_ICONS[alert.kind] ?? 'storm'} className="weather-alert-icon" />
                <div className="weather-alert-text">
                  <strong>{alertTitle(alert)}</strong>
                  {periodText(alert) && <span className="weather-alert-period">: {periodText(alert)}.</span>}
                  {travelTip(alert) && <span className="weather-alert-tip"> {travelTip(alert)}</span>}
                </div>
                <button
                  type="button"
                  className="weather-alert-close"
                  aria-label={`Cerrar ${alertTitle(alert).toLowerCase()}`}
                  onClick={() => dismiss(alert)}
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
