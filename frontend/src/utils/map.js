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
