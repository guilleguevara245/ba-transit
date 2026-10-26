import { distanceKm } from './map.js'

/**
 * Velocidad comercial aproximada (km/h, incluye las paradas) de cada
 * modo, calibrada con recorridos conocidos: la Linea A completa (~10 km)
 * tarda unos 30 min, el Mitre Retiro - Tigre (~29 km) unos 55 min y el
 * Sarmiento Once - Moreno (~37 km) unos 65 min. Es una estimacion.
 */
export const COMMERCIAL_SPEED_KMH = { SUBTE: 21, PREMETRO: 15, TREN: 33 }

/** Minimo por tramo: aunque dos estaciones esten pegadas, el tren frena y arranca. */
const MIN_SEGMENT_MINUTES = 1

/** Minutos estimados para un tramo entre dos estaciones consecutivas. */
export function segmentMinutes(a, b, mode) {
  const speed = COMMERCIAL_SPEED_KMH[mode] ?? COMMERCIAL_SPEED_KMH.SUBTE
  return Math.max(MIN_SEGMENT_MINUTES, (distanceKm(a, b) / speed) * 60)
}

/**
 * Viaje entre dos estaciones de un mismo ramal (en cualquier sentido):
 * minutos estimados, cantidad de estaciones y km aproximados.
 * stations: estaciones del ramal ordenadas.
 */
export function estimateTrip(stations, fromIndex, toIndex, mode) {
  const start = Math.min(fromIndex, toIndex)
  const end = Math.max(fromIndex, toIndex)
  let minutes = 0
  let km = 0
  for (let i = start; i < end; i++) {
    minutes += segmentMinutes(stations[i], stations[i + 1], mode)
    km += distanceKm(stations[i], stations[i + 1])
  }
  return { minutes: Math.round(minutes), stops: end - start, km }
}

/** "1 h 05 min" o "12 min". */
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')} min`
}
