/**
 * Agrupa las estaciones del mapa por ramal y las ordena por su
 * posicion en el recorrido, para dibujar una linea por ramal.
 * Se agrupa por ramal (y no por linea) para que una linea con varios
 * ramales no quede unida en zigzag entre ramales distintos.
 */
export function buildRoutes(stations) {
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
    .map(({ stations: branchStations, ...route }) => ({
      ...route,
      positions: [...branchStations]
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
        .map((s) => [Number(s.latitude), Number(s.longitude)]),
    }))
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
