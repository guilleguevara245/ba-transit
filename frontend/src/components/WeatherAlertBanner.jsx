import { useEffect, useState } from 'react'
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
  '/dispositivos',
  '/privacidad',
  '/condiciones',
]

/** Lo que dura la animacion de entrada (con el escalonado de la segunda y tercera). */
const ENTER_MS = 1500

/**
 * Fase de cada alerta en esta visita: 'esperando' (todavia cerrada),
 * 'entrando' (animandose) o 'vista'. Vive fuera del componente para que
 * la animacion no se repita al cambiar de pagina.
 */
const phases = new Map()
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

function phaseOf(key) {
  if (!phases.has(key)) phases.set(key, reducedMotion() ? 'vista' : 'esperando')
  return phases.get(key)
}

/**
 * Llama a fn cuando la pagina termino de cargar, esta a la vista y el
 * navegador tiene un respiro. La animacion corre en el hilo principal: si
 * arranca mientras la pagina todavia se esta armando (mapas, tarjetas,
 * fuentes), cuando se pinta el primer cuadro ya termino y no se ve.
 */
function whenSettled(fn) {
  let cancelled = false
  const start = () =>
    !cancelled && window.requestAnimationFrame(() => window.requestAnimationFrame(() => !cancelled && fn()))
  const run = () => {
    if (cancelled) return
    if (document.hidden) {
      document.addEventListener('visibilitychange', run, { once: true })
      return
    }
    if (window.requestIdleCallback) window.requestIdleCallback(start, { timeout: 1200 })
    else setTimeout(start, 200)
  }
  if (document.readyState === 'complete') run()
  else window.addEventListener('load', run, { once: true })
  return () => {
    cancelled = true
  }
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
  const [, setTick] = useState(0)
  // (dismissKey con una flecha: su segundo parametro es la fecha y map le pasaria el indice.)
  const waitingKeys = alerts
    .map((alert) => dismissKey(alert))
    .filter((key) => phaseOf(key) === 'esperando')
    .join('|')

  // Las alertas nuevas esperan a que la pagina se calme y recien ahi se animan.
  useEffect(() => {
    if (!waitingKeys) return undefined
    const keys = waitingKeys.split('|')
    const cancel = whenSettled(() => {
      keys.forEach((key) => phases.set(key, 'entrando'))
      setTick((n) => n + 1)
      // Este timer no se cancela con el efecto: al pasar a 'entrando' cambian las
      // claves que esperan y el efecto se limpia, pero la animacion tiene que seguir.
      setTimeout(() => {
        keys.forEach((key) => phases.set(key, 'vista'))
        setTick((n) => n + 1)
      }, ENTER_MS)
    })
    // Solo se cancela la espera: si la pagina cambia antes de que arranque, vuelve a esperar.
    return cancel
  }, [waitingKeys])

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
        const phase = phaseOf(dismissKey(alert))
        const motion = { esperando: ' weather-alert-waiting', entrando: ' weather-alert-enter' }[phase] ?? ''
        return (
          <div key={alert.id} className={`weather-alert ${level.className}${motion}`}>
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
