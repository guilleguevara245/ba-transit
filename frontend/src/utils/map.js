import TRACK_SHAPES from '../data/trackShapes.json'

/** Un polyline codificado (el formato de Google, 5 decimales) como [[lat, lon], ...]. */
export function decodePolyline(text) {
  const points = []
  let index = 0
  let lat = 0
  let lon = 0
  while (index < text.length) {
    for (const axis of [0, 1]) {
      let result = 0
      let shift = 0
      let byte
      do {
        byte = text.charCodeAt(index++) - 63
        result |= (byte & 0x1f) << shift
        shift += 5
      } while (byte >= 0x20)
      const delta = result & 1 ? ~(result >> 1) : result >> 1
      if (axis === 0) lat += delta
      else lon += delta
    }
    points.push([lat / 1e5, lon / 1e5])
  }
  return points
}

/** Distancia en km entre dos puntos [lat, lon]. */
const km = (a, b) => distanceKm({ latitude: a[0], longitude: a[1] }, { latitude: b[0], longitude: b[1] })

/** El punto del tramo a-b mas cercano a p (en grados, con la longitud achicada por la latitud). */
function closestOnSegment(p, a, b) {
  const k = Math.cos((p[0] * Math.PI) / 180)
  const dx = (b[1] - a[1]) * k
  const dy = b[0] - a[0]
  const length = dx * dx + dy * dy
  const t = length ? Math.max(0, Math.min(1, (((p[1] - a[1]) * k) * dx + (p[0] - a[0]) * dy) / length)) : 0
  const point = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
  return { point, km: km(p, point) }
}

/** Donde cae p sobre el trazado: el tramo (index), el punto y a cuantos km queda. */
function project(shape, p) {
  let best = { index: 0, point: shape[0], km: Infinity }
  for (let i = 1; i < shape.length; i++) {
    const hit = closestOnSegment(p, shape[i - 1], shape[i])
    if (hit.km < best.km) best = { index: i, ...hit }
  }
  return best
}

/** Mas lejos que esto del trazado, una estacion no se toma como parte de el. */
const MAX_OFF_TRACK_KM = 0.6

/**
 * El trazado de las vias entre la primera y la ultima estacion (puede ser
 * una parte del ramal), o null si las estaciones no caen sobre el.
 */
export function trackBetween(shape, first, last) {
  if (!shape || shape.length < 2) return null
  const from = project(shape, first)
  const to = project(shape, last)
  if (from.km > MAX_OFF_TRACK_KM || to.km > MAX_OFF_TRACK_KM) return null
  // El trazado va en el orden del ramal: la ultima estacion no puede caer antes que la primera.
  const before = to.index < from.index
  const sameStretchBackwards =
    to.index === from.index && km(shape[from.index - 1], to.point) < km(shape[from.index - 1], from.point)
  if (before || sameStretchBackwards) return null
  return [first, from.point, ...shape.slice(from.index, to.index), to.point, last]
}

/**
 * Agrupa las estaciones del mapa por ramal y las ordena por su
 * posicion en el recorrido, para dibujar una linea por ramal.
 * Se agrupa por ramal (y no por linea) para que una linea con varios
 * ramales no quede unida en zigzag entre ramales distintos. Cada ramal va
 * por el trazado de sus vias (shapes: de OpenStreetMap, ver
 * data/trackShapes.json); si no hay trazado o no coincide, de estacion a
 * estacion en linea recta.
 */
export function buildRoutes(stations, shapes = TRACK_SHAPES) {
  const byBranch = new Map()

  for (const station of stations) {
    if (!byBranch.has(station.branchId)) {
      byBranch.set(station.branchId, {
        branchId: station.branchId,
        lineId: station.lineId,
        color: station.lineColorHex,
        stations: [],
      })
    }
    byBranch.get(station.branchId).stations.push(station)
  }

  return Array.from(byBranch.values())
    .map(({ stations: branchStations, ...route }) => {
      const straight = [...branchStations]
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
        .map((s) => [Number(s.latitude), Number(s.longitude)])
      const shape = shapes[route.branchId] ? decodePolyline(shapes[route.branchId]) : null
      const track = straight.length > 1 ? trackBetween(shape, straight[0], straight[straight.length - 1]) : null
      return { ...route, positions: track ?? straight }
    })
    .filter((route) => route.positions.length > 1)
}

/** Una entrada de leyenda por linea, en el orden en que aparecen. */
export function buildLegend(stations) {
  const seen = new Map()
  for (const station of stations) {
    if (!seen.has(station.lineId)) {
      seen.set(station.lineId, { id: station.lineId, name: station.lineName, color: station.lineColorHex })
    }
  }
  return Array.from(seen.values())
}

/**
 * Combinaciones oficiales del subte ("linea:estacion"). Se listan a mano
 * porque calcularlas por cercania da falsos positivos (por ejemplo,
 * Piedras y Avenida de Mayo estan a 140 m pero no combinan).
 */
export const SUBTE_TRANSFERS = [
  ['A:Perú', 'D:Catedral', 'E:Bolívar'],
  ['A:Lima', 'C:Avenida de Mayo'],
  ['A:Plaza Miserere', 'H:Once - 30 de Diciembre'],
  ['B:Leandro N. Alem', 'E:Correo Central'],
  ['B:Carlos Pellegrini', 'C:Diagonal Norte', 'D:9 de Julio'],
  ['B:Pueyrredón', 'H:Corrientes'],
  ['C:Retiro', 'E:Retiro'],
  ['C:Independencia', 'E:Independencia'],
  ['D:Pueyrredón', 'H:Santa Fe'],
  ['E:Jujuy', 'H:Humberto I'],
  ['E:Plaza de los Virreyes - Eva Perón', 'P:Intendente Saguier'],
]

const stationKey = (station) => `${station.lineCode}:${station.stationName}`

/** Estaciones de otras lineas con las que combina la estacion dada. */
export function findTransfers(stations, station, groups = SUBTE_TRANSFERS) {
  const group = groups.find((g) => g.includes(stationKey(station)))
  if (!group) return []
  return stations.filter((s) => s.lineId !== station.lineId && group.includes(stationKey(s)))
}

/**
 * Posicion de la estacion dentro de su ramal: numero, total y
 * cabeceras (primera y ultima estacion).
 */
export function routeInfo(stations, station) {
  const branch = stations
    .filter((s) => s.branchId === station.branchId)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)

  return {
    position: branch.findIndex((s) => s.stationId === station.stationId) + 1,
    total: branch.length,
    from: branch[0]?.stationName,
    to: branch[branch.length - 1]?.stationName,
  }
}

/**
 * Nombre corto de la operadora para la tarjeta de estacion ("Trenes
 * Argentinos Operaciones" queda en "Trenes Argentinos"; "Emova Movilidad",
 * en "Emova"). Sin dato, null.
 */
export function shortOperator(operator) {
  const name = operator?.trim()
  if (!name) return null
  return name.replace(/\s+(Operaciones|Movilidad)$/i, '')
}

/**
 * Todos los ramales de la linea que paran en esta estacion (en el Roca,
 * Temperley es parada de varios): un routeInfo por ramal, sin repetir.
 */
export function stationBranches(stations, station) {
  const same = stations.filter(
    (s) => s.lineId === station.lineId && s.stationName === station.stationName,
  )
  const seen = new Set()
  const result = []
  for (const s of same.length > 0 ? same : [station]) {
    if (seen.has(s.branchId)) continue
    seen.add(s.branchId)
    result.push({ branchId: s.branchId, ...routeInfo(stations, s) })
  }
  return result
}

/** Distancia en km entre dos puntos {latitude, longitude} (haversine). */
export function distanceKm(a, b) {
  const toRad = (deg) => (Number(deg) * Math.PI) / 180
  const dLat = toRad(b.latitude) - toRad(a.latitude)
  const dLng = toRad(b.longitude) - toRad(a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/**
 * Resumen de una linea a partir de sus estaciones con coordenadas:
 * cantidad de estaciones distintas y, por ramal, cabeceras y largo
 * aproximado (suma de tramos rectos entre estaciones, asi que es una
 * cota inferior del recorrido real).
 */
export function lineSummary(stations, branchNames = new Map()) {
  const byBranch = new Map()
  for (const s of stations) {
    if (!byBranch.has(s.branchId)) byBranch.set(s.branchId, [])
    byBranch.get(s.branchId).push(s)
  }

  const branches = Array.from(byBranch.entries()).map(([branchId, list]) => {
    const sorted = [...list].sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    let km = 0
    for (let i = 1; i < sorted.length; i++) km += distanceKm(sorted[i - 1], sorted[i])
    // "Plaza Constitucion - Bosques (via Quilmes)": el "via" distingue dos
    // ramales con las mismas cabeceras.
    const via = branchNames.get(branchId)?.match(/\((vía [^)]+)\)/)?.[1] ?? null
    return { from: sorted[0].stationName, to: sorted[sorted.length - 1].stationName, km, via }
  })

  return {
    stationCount: new Set(stations.map((s) => s.stationName)).size,
    branches,
  }
}

/** Codigos de las otras lineas de subte con las que combina una linea. */
export function connectingLineCodes(lineCode, groups = SUBTE_TRANSFERS) {
  const codes = new Set()
  for (const group of groups) {
    if (group.some((key) => key.startsWith(`${lineCode}:`))) {
      group.forEach((key) => {
        const code = key.split(':')[0]
        if (code !== lineCode) codes.add(code)
      })
    }
  }
  return [...codes].sort()
}
