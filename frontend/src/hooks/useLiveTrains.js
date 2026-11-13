import { useApi } from './useApi.js'
import { TRIP_TRAIN_LINES } from '../utils/nextTrains.js'

const REFRESH_MS = 30_000

/** Donde se piden los trenes andando de una linea (null si la linea no tiene). */
export function liveTrainsPath(mode, lineCode) {
  if (!lineCode) return null
  if (mode === 'TREN' && TRIP_TRAIN_LINES.has(lineCode)) return `/api/v1/trenes/en-vivo?linea=${encodeURIComponent(lineCode)}`
  if (mode === 'SUBTE' || mode === 'PREMETRO') return `/api/v1/subte/en-vivo?linea=${encodeURIComponent(lineCode)}`
  return null
}

/**
 * Los trenes andando de una linea, para el mapa: { trains, estimated,
 * updatedAt } o null. estimated: la posicion se calcula con los horarios
 * (subte y Premetro); si no, es el GPS del tren (Trenes Argentinos).
 */
export function useLiveTrains(mode, lineCode) {
  const { data } = useApi(liveTrainsPath(mode, lineCode), { refreshMs: REFRESH_MS })
  if (!data?.available || !data.trains?.length) return null
  return { trains: data.trains, estimated: Boolean(data.estimated), updatedAt: data.updatedAt }
}
