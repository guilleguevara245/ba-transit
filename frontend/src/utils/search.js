import { MODE_LABELS } from '../constants.js'

/**
 * Convierte la respuesta de /api/v1/search en una lista plana de
 * opciones navegables (primero lineas, despues estaciones), cada una
 * con el destino al que lleva.
 */
export function toSearchOptions(results) {
  if (!results) return []

  const lines = results.lines.map((line) => ({
    key: `line-${line.id}`,
    group: 'Líneas',
    name: line.name,
    meta: MODE_LABELS[line.mode] ?? line.mode,
    color: line.colorHex,
    href: `/lineas/${line.id}`,
  }))

  const stations = results.stations.map((station) => ({
    key: `station-${station.stationId}`,
    group: 'Estaciones',
    name: station.stationName,
    meta: station.lineName,
    color: station.lineColorHex,
    href: `/lineas/${station.lineId}?estacion=${station.stationId}`,
  }))

  return [...lines, ...stations]
}

/** Siguiente indice activo al moverse con las flechas (da la vuelta). */
export function moveActiveIndex(current, delta, length) {
  if (length === 0) return -1
  if (current < 0) return delta > 0 ? 0 : length - 1
  return (current + delta + length) % length
}
