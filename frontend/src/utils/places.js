import { distanceKm } from './map.js'
import { normalizeText } from './stationSearch.js'

/** Estaciones con el mismo nombre a menos de esta distancia son el mismo lugar. */
export const SAME_PLACE_KM = 0.5

const shortLineName = (name) => name.replace(/^Línea\s+/i, '').replace(/\s*\(Línea P\)$/, '')

/** "Línea C" / "Líneas C, E y Mitre". */
export function linesLabel(lines) {
  if (lines.length === 1) return lines[0].lineName
  const names = lines.map((l) => shortLineName(l.lineName))
  return `Líneas ${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

/**
 * Agrupa las estaciones en "lugares": Retiro es uno solo aunque tenga
 * cinco lineas, asi el planificador elige solo por cual conviene salir o
 * llegar. Dos estaciones con el mismo nombre pero lejos (Florida del
 * subte B y Florida del Mitre) quedan separadas.
 *
 * Cada lugar tiene la forma que usa StationPicker: stationId (clave),
 * stationName, lineName (texto de lineas), lineColorHex, colors, mas
 * stations (todas las estaciones del lugar) y su posicion.
 */
export function buildPlaces(stations) {
  const byName = new Map()
  for (const s of stations ?? []) {
    const name = normalizeText(s.stationName)
    if (!byName.has(name)) byName.set(name, [])
    byName.get(name).push(s)
  }

  const places = []
  for (const group of byName.values()) {
    const clusters = []
    for (const s of group) {
      const cluster = clusters.find((c) => c.some((other) => distanceKm(other, s) <= SAME_PLACE_KM))
      if (cluster) cluster.push(s)
      else clusters.push([s])
    }
    for (const cluster of clusters) {
      const lines = []
      for (const s of cluster) {
        if (!lines.some((l) => l.lineId === s.lineId)) {
          lines.push({ lineId: s.lineId, lineName: s.lineName, color: s.lineColorHex, mode: s.lineMode })
        }
      }
      const first = cluster[0]
      places.push({
        stationId: `lugar-${cluster.map((s) => s.stationId).sort((a, b) => a - b)[0]}`,
        stationName: first.stationName,
        lineName: linesLabel(lines),
        lineColorHex: lines[0].color,
        colors: lines.map((l) => l.color),
        lines,
        stations: cluster,
        latitude: cluster.reduce((sum, s) => sum + Number(s.latitude), 0) / cluster.length,
        longitude: cluster.reduce((sum, s) => sum + Number(s.longitude), 0) / cluster.length,
      })
    }
  }
  return places.sort((a, b) => a.stationName.localeCompare(b.stationName, 'es'))
}
