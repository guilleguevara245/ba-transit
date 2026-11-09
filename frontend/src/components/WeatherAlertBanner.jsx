import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApi } from '../hooks/useApi.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { useWeatherPlaces } from '../hooks/useWeatherPlaces.js'
import Chevrons from './Chevrons.jsx'
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
import { reducedMotion, whenSettled } from '../utils/motion.js'
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

/** En el celular cada alerta va en un renglon (el titulo); al tocarla se abre el detalle. */
const COMPACT = '(max-width: 600px)'

/** "hasta el lunes" -> "Hasta el lunes", para el detalle debajo del titulo. */
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

/** Lo que dura la animacion de entrada (con el escalonado de la segunda y tercera). */
const ENTER_MS = 1500

/**
 * Fase de cada alerta en esta visita: 'esperando' (todavia cerrada),
 * 'entrando' (animandose) o 'vista'. Vive fuera del componente para que
 * la animacion no se repita al cambiar de pagina.
 */
const phases = new Map()

function phaseOf(key) {
  if (!phases.has(key)) phases.set(key, reducedMotion() ? 'vista' : 'esperando')
  return phases.get(key)
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
  const compact = useMediaQuery(COMPACT)
  // Las alertas abiertas en el celular (su id).
  const [expanded, setExpanded] = useState([])
  const toggle = (id) => setExpanded((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

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
        const title = (
          <strong>
            {alertTitle(alert)}
            {alert.where && ` en ${alert.where}`}
          </strong>
        )
        const period = periodText(alert)
        const tip = travelTip(alert)
        const open = expanded.includes(alert.id)
        const detailId = `alerta-clima-${alert.id}`
        return (
          <div
            key={alert.id}
            className={`weather-alert ${level.className}${motion}${compact ? ' compact' : ''}${open ? ' open' : ''}`}
          >
            <div className="weather-alert-inner">
              <div className="wrap weather-alert-row">
                <WeatherIcon kind={ALERT_ICONS[alert.kind] ?? 'storm'} className="weather-alert-icon" />
                {compact ? (
                  <div className="weather-alert-text">
                    <button
                      type="button"
                      className="weather-alert-toggle chevrons-host"
                      aria-expanded={open}
                      aria-controls={detailId}
                      onClick={() => toggle(alert.id)}
                    >
                      {title}
                      <Chevrons className="weather-alert-chevron" />
                    </button>
                    {open && (period || tip) && (
                      <p className="weather-alert-detail" id={detailId}>
                        {period && <span className="weather-alert-period">{capitalize(period)}.</span>}
                        {tip && <span className="weather-alert-tip"> {tip}</span>}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="weather-alert-text">
                    {title}
                    {period && <span className="weather-alert-period">: {period}.</span>}
                    {tip && <span className="weather-alert-tip"> {tip}</span>}
                  </div>
                )}
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
