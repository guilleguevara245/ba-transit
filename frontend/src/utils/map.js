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
      seen.set(station.lineId, { name: station.lineName, color: station.lineColorHex })
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
