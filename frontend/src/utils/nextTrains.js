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

/** "8 min", "llegando" o "~8 min" si es estimado. */
export function formatArrival({ minutes, estimated }) {
  const text = minutes < 1 ? 'llegando' : `${minutes} min`
  return estimated ? `~${text}` : text
}
