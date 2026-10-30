import { MODE_LABELS } from '../constants.js'
import { busDescription, busParams, busTitle, plainText } from './busNames.js'
import { linePath } from './lineSlug.js'

/** Como mucho estas lineas de colectivo en el desplegable (una linea puede tener varios carteles). */
export const MAX_BUSES = 6

/**
 * Convierte la respuesta de /api/v1/search (y la de colectivos, si hay)
 * en una lista plana de opciones navegables, cada una con el destino al
 * que lleva. Orden: lineas, estaciones y colectivos; si se busco un
 * numero ("203"), los colectivos van primero.
 */
export function toSearchOptions(results, buses = null, query = '') {
  if (!results && !buses?.length) return []

  const lines = (results?.lines ?? []).map((line) => ({
    key: `line-${line.id}`,
    group: 'Líneas',
    name: line.name,
    meta: MODE_LABELS[line.mode] ?? line.mode,
    color: line.colorHex,
    href: linePath(line),
  }))

  const stations = (results?.stations ?? []).map((station) => ({
    key: `station-${station.stationId}`,
    group: 'Estaciones',
    name: station.stationName,
    meta: station.lineName,
    color: station.lineColorHex,
    href: `/lineas/${station.lineId}?estacion=${station.stationId}`,
  }))

  const busOptions = (buses ?? []).slice(0, MAX_BUSES).map((route) => ({
    key: `bus-${route.id}`,
    group: 'Colectivos',
    name: busTitle(route),
    meta: busDescription(route) ?? (route.agency ? plainText(route.agency) : 'Colectivo'),
    color: route.color || '#17171a',
    href: `/colectivos?${new URLSearchParams(busParams(route.shortName, route.id))}`,
  }))

  return /^\d+[a-z]?$/i.test(query.trim())
    ? [...busOptions, ...lines, ...stations]
    : [...lines, ...stations, ...busOptions]
}

/** Siguiente indice activo al moverse con las flechas (da la vuelta). */
export function moveActiveIndex(current, delta, length) {
  if (length === 0) return -1
  if (current < 0) return delta > 0 ? 0 : length - 1
  return (current + delta + length) % length
}
