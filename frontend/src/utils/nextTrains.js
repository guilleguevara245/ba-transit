import { formatDuration } from './travelTime.js'

/**
 * De donde salen los proximos trenes de una estacion: el subte usa el
 * pronostico de la API Transporte y el Belgrano Norte la pantalla de
 * Ferrovias. Para el resto de las lineas no hay datos en vivo (null).
 */
const LIVE_TRAIN_LINES = new Set(['BELGRANO_NORTE'])

export function nextTrainsPath(mode, lineCode, stationName) {
  if (!lineCode || !stationName) return null
  const query = `linea=${encodeURIComponent(lineCode)}&estacion=${encodeURIComponent(stationName)}`
  if (mode === 'SUBTE') return `/api/v1/subte/proximos?${query}`
  if (mode === 'TREN' && LIVE_TRAIN_LINES.has(lineCode)) return `/api/v1/trenes/proximos?${query}`
  return null
}

/** "8 min", "1 h 27 min" (desde la hora), "llegando" o "~8 min" si es estimado. */
export function formatArrival({ minutes, estimated }) {
  const text = minutes < 1 ? 'llegando' : formatDuration(minutes)
  return estimated ? `~${text}` : text
}

/** Horario programado (GTFS): subte y premetro. null para el resto. */
export function schedulePath(mode, lineCode, stationName) {
  if (!lineCode || !stationName || (mode !== 'SUBTE' && mode !== 'PREMETRO')) return null
  return `/api/v1/subte/horario?linea=${encodeURIComponent(lineCode)}&estacion=${encodeURIComponent(stationName)}`
}

/** Hay datos en vivo utiles: al menos un sentido con algun tren. */
export function hasLiveArrivals(data) {
  return Boolean(data?.available && data.directions?.some((d) => d.arrivals?.length > 0))
}

/** "8:15": hora de reloj dentro de `minutes` minutos. */
export function clockIn(minutes, now = new Date()) {
  const at = new Date(now.getTime() + minutes * 60_000)
  return `${at.getHours()}:${String(at.getMinutes()).padStart(2, '0')}`
}

/**
 * Texto de un sentido segun el horario: proximas pasadas aproximadas, o
 * el primer tren si todavia no empezo el servicio (o ya termino por hoy).
 */
export function scheduleLabel(direction, now = new Date()) {
  const first = direction.arrivals[0]
  if (!first) return 'Sin más trenes hoy'
  if (direction.headwayMinutes == null) return `Primer tren ${clockIn(first.minutes, now)}`
  return direction.arrivals.map(formatArrival).join(' · ')
}

/** Si la linea tiene proximos trenes (en vivo u horario): subte, Premetro, Belgrano Norte y Urquiza. */
export function hasTrainTimes(mode, lineCode) {
  return mode === 'SUBTE' || mode === 'PREMETRO' || (mode === 'TREN' && (LIVE_TRAIN_LINES.has(lineCode) || lineCode === 'URQUIZA'))
}
