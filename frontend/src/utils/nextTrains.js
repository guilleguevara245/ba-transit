import { formatDuration } from './travelTime.js'

/**
 * De donde salen los proximos trenes de una estacion: el subte usa el
 * pronostico de la API Transporte, el Belgrano Norte la pantalla de
 * Ferrovias y las lineas de Trenes Argentinos la API de Trenes de Ariel
 * Aguirre (a veces en vivo, a veces el horario programado: lo dice
 * "scheduled"). El Urquiza usa su horario, que esta en el sitio.
 */
const LIVE_TRAIN_LINES = new Set([
  'BELGRANO_NORTE',
  'SARMIENTO',
  'MITRE',
  'ROCA',
  'SAN_MARTIN',
  'BELGRANO_SUR',
  'TREN_DE_LA_COSTA',
])

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

/**
 * Un tren de la lista del servidor. Si todos son del horario programado
 * (scheduled), van sin "~": la tarjeta ya dice "según horario".
 */
export function serverArrivalText(arrival, scheduled) {
  return formatArrival(scheduled ? { ...arrival, estimated: false } : arrival)
}

/** El anden si todos los trenes que corren en el sentido salen del mismo (se dice una vez); si no, null. */
export function sharedPlatform(arrivals) {
  const running = (arrivals ?? []).filter((a) => !a.cancelled)
  const first = running[0]?.platform
  return first && running.every((a) => a.platform === first) ? first : null
}

/**
 * Lo que se agrega a un tren de la lista: el destino si no es el del
 * sentido y el anden si no es el de todos (shared). Un cancelado no lleva
 * anden. Cada uno, null si no va.
 */
export function arrivalExtras(arrival, towards, shared = null) {
  const destination = arrival.destination && arrival.destination !== towards ? arrival.destination : null
  const platform = !arrival.cancelled && arrival.platform && arrival.platform !== shared ? arrival.platform : null
  return { destination, platform }
}

/** Lo mismo como texto ("a Mitre, andén 3"), o "cancelado". null si no hay nada que agregar. */
export function arrivalDetails(arrival, towards, shared = null) {
  if (arrival.cancelled) return 'cancelado'
  const { destination, platform } = arrivalExtras(arrival, towards, shared)
  const parts = []
  if (destination) parts.push(`a ${destination}`)
  if (platform) parts.push(`andén ${platform}`)
  return parts.length > 0 ? parts.join(', ') : null
}

/**
 * El tipo de servicio, para su icono: 'rapido' (rapido o expreso),
 * 'semirrapido', 'directo' o null (el comun u otro).
 */
export function serviceKind(name) {
  if (!name) return null
  const n = name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  if (n.includes('semirrapido') || n.includes('semi rapido') || n.includes('semi-rapido')) return 'semirrapido'
  if (n.includes('rapido') || n.includes('expreso')) return 'rapido'
  if (n.includes('directo')) return 'directo'
  return null
}

/**
 * Lineas de Trenes Argentinos: las que tienen viajes con hora de llegada
 * (Como llegar) en /api/v1/trenes/viaje.
 */
export const TRIP_TRAIN_LINES = new Set(['SARMIENTO', 'MITRE', 'ROCA', 'SAN_MARTIN', 'BELGRANO_SUR', 'TREN_DE_LA_COSTA'])

/** El pedido de los proximos trenes entre dos estaciones de una linea (o null si la linea no los tiene). */
export function tripTrainsPath(lineCode, from, to) {
  if (!TRIP_TRAIN_LINES.has(lineCode) || !from || !to || from === to) return null
  const q = (v) => encodeURIComponent(v)
  return `/api/v1/trenes/viaje?linea=${q(lineCode)}&desde=${q(from)}&hasta=${q(to)}`
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

/** Si la linea tiene proximos trenes (en vivo u horario): subte, Premetro, Urquiza y las de tren con datos del servidor. */
export function hasTrainTimes(mode, lineCode) {
  return mode === 'SUBTE' || mode === 'PREMETRO' || (mode === 'TREN' && (LIVE_TRAIN_LINES.has(lineCode) || lineCode === 'URQUIZA'))
}
