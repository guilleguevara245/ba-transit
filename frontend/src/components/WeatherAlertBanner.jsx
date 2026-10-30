import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApi } from '../hooks/useApi.js'
import { useWeatherPlaces } from '../hooks/useWeatherPlaces.js'
import WeatherIcon from './WeatherIcon.jsx'
import {
  ALERT_ICONS,
  ALERT_LEVELS,
  alertTitle,
  alertsForPlaces,
  dismissKey,
  periodText,
  travelTip,
} from '../utils/weatherAlerts.js'
import { gridQuery } from '../utils/weatherPlaces.js'
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

// Cuando aparecio cada alerta en esta visita (la animacion no se repite al cambiar de pagina).
const shownAt = new Map()
/** Lo que dura la animacion de entrada (con el escalonado de la segunda y tercera). */
const ENTER_MS = 1500

/**
 * true mientras la alerta esta entrando. Se decide la primera vez que se ve
 * y se mantiene durante la animacion: si se calculara en cada render, el
 * primer re-render (otra respuesta, un cambio de pagina) le sacaba la clase
 * y la animacion se cortaba al instante.
 */
function isEntering(key, now = Date.now()) {
  if (!shownAt.has(key)) shownAt.set(key, now)
  return now - shownAt.get(key) < ENTER_MS
}

function readDismissed() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

const alertsPath = (place) => (place ? `/api/v1/clima/alertas?${gridQuery(place)}` : null)

/**
 * Franja con las alertas meteorologicas del SMN vigentes en tus lugares
 * (Casa y Trabajo, tu zona o Capital: la naranja de Capital no le aparece
 * a quien vive en San Miguel), en una linea: tipo, cuando y un consejo
 * para viajar (sin el texto largo del SMN). Solo aparece cuando hay alguna,
 * apareciendo con un barrido desde la raya de color la primera vez. Cerrada, no vuelve en el dia
 * aunque el SMN la renueve; vuelve si sube de nivel (ver dismissKey).
 */
export default function WeatherAlertBanner() {
  const { pathname } = useLocation()
  const { places, ready } = useWeatherPlaces()
  const first = useApi(ready ? alertsPath(places[0]) : null, { refreshMs: REFRESH_MS })
  const second = useApi(ready ? alertsPath(places[1]) : null, { refreshMs: REFRESH_MS })
  const [dismissed, setDismissed] = useState(readDismissed)

  const lists = [
    { place: places[0], alerts: first.data?.alerts },
    ...(places[1] ? [{ place: places[1], alerts: second.data?.alerts }] : []),
  ]
  const alerts = alertsForPlaces(lists).filter((a) => !dismissed.includes(dismissKey(a)))
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
        const enter = isEntering(key)
        return (
          <div key={alert.id} className={`weather-alert ${level.className}${enter ? ' weather-alert-enter' : ''}`}>
            <div className="weather-alert-inner">
              <div className="wrap weather-alert-row">
                <WeatherIcon kind={ALERT_ICONS[alert.kind] ?? 'storm'} className="weather-alert-icon" />
                <div className="weather-alert-text">
                  <strong>
                    {alertTitle(alert)}
                    {alert.where && ` en ${alert.where}`}
                  </strong>
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
