import { SUBTE_TRANSFERS, distanceKm } from './map.js'
import { segmentMinutes } from './travelTime.js'

/** Espera promedio al subir a otra linea (o cambiar de ramal). */
export const WAIT_MINUTES = 4
/** Hasta esta distancia se propone caminar entre estaciones de lineas distintas. */
export const MAX_WALK_KM = 0.4
const WALK_KMH = 4.5

const key = (s) => `${s.lineCode}:${s.stationName}`

/**
 * Grafo de la red a partir de las estaciones del mapa: viajar entre
 * estaciones consecutivas de un ramal, cambiar de ramal en la misma
 * estacion y combinar caminando con otras lineas (combinaciones oficiales
 * del subte o estaciones a menos de MAX_WALK_KM).
 */
export function buildGraph(stations, { accessibleOnly = false } = {}) {
  // Con accessibleOnly, solo se combina (caminando o de ramal) entre
  // estaciones accesibles; viajar a bordo pasando por otras no importa.
  const canTransfer = (a, b) => !accessibleOnly || (a.accessible === true && b.accessible === true)
  const edges = new Map(stations.map((s) => [s.stationId, []]))
  const add = (from, to, minutes, type) => edges.get(from.stationId).push({ to: to.stationId, minutes, type })

  // 1. Tramos de cada ramal, en los dos sentidos.
  const byBranch = new Map()
  for (const s of stations) {
    if (!byBranch.has(s.branchId)) byBranch.set(s.branchId, [])
    byBranch.get(s.branchId).push(s)
  }
  for (const list of byBranch.values()) {
    list.sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    for (let i = 0; i < list.length - 1; i++) {
      const minutes = segmentMinutes(list[i], list[i + 1], list[i].lineMode)
      add(list[i], list[i + 1], minutes, 'ride')
      add(list[i + 1], list[i], minutes, 'ride')
    }
  }

  // 2. Misma estacion en otro ramal de la misma linea, y combinaciones.
  for (let i = 0; i < stations.length; i++) {
    for (let j = i + 1; j < stations.length; j++) {
      const a = stations[i]
      const b = stations[j]
      if (a.lineId === b.lineId) {
        if (a.stationName === b.stationName && a.branchId !== b.branchId && canTransfer(a, b)) {
          add(a, b, WAIT_MINUTES, 'branch')
          add(b, a, WAIT_MINUTES, 'branch')
        }
        continue
      }
      const official = SUBTE_TRANSFERS.some((g) => g.includes(key(a)) && g.includes(key(b)))
      const km = distanceKm(a, b)
      if ((official || km <= MAX_WALK_KM) && canTransfer(a, b)) {
        const minutes = Math.max(2, (km / WALK_KMH) * 60) + WAIT_MINUTES
        add(a, b, minutes, 'walk')
        add(b, a, minutes, 'walk')
      }
    }
  }
  return edges
}

/**
 * Camino mas rapido (Dijkstra) entre cualquiera de los ids de origen y
 * cualquiera de los de destino. Devuelve la lista de ids y los minutos,
 * o null si no hay camino.
 */
export function shortestPath(graph, originIds, targetIds) {
  const targets = new Set(targetIds)
  const dist = new Map()
  const prev = new Map()
  const queue = []
  for (const id of originIds) {
    dist.set(id, 0)
    queue.push([0, id])
  }
  while (queue.length > 0) {
    queue.sort((x, y) => x[0] - y[0])
    const [d, id] = queue.shift()
    if (d > (dist.get(id) ?? Infinity)) continue
    if (targets.has(id)) {
      const path = [id]
      while (prev.has(path[0])) path.unshift(prev.get(path[0]).from)
      return { path, minutes: d, edges: path.slice(1).map((to) => prev.get(to).edge) }
    }
    for (const edge of graph.get(id) ?? []) {
      const nd = d + edge.minutes
      if (nd < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, nd)
        prev.set(edge.to, { from: id, edge })
        queue.push([nd, edge.to])
      }
    }
  }
  return null
}

/**
 * Convierte el camino en pasos para mostrar: tramos en una linea (con
 * hacia donde va el tren y cuantas estaciones) y caminatas entre lineas.
 */
export function toLegs(result, stations) {
  const byId = new Map(stations.map((s) => [s.stationId, s]))
  const branchStations = (branchId) =>
    stations.filter((s) => s.branchId === branchId).sort((a, b) => a.sequenceOrder - b.sequenceOrder)
  const legs = []
  result.edges.forEach((edge, i) => {
    const from = byId.get(result.path[i])
    const to = byId.get(result.path[i + 1])
    if (edge.type === 'ride') {
      const last = legs[legs.length - 1]
      if (last && last.type === 'ride' && last.branchId === from.branchId) {
        last.to = to
        last.stops += 1
        last.minutes += edge.minutes
        return
      }
      const branch = branchStations(from.branchId)
      const towards = to.sequenceOrder > from.sequenceOrder ? branch[branch.length - 1] : branch[0]
      legs.push({ type: 'ride', branchId: from.branchId, from, to, stops: 1, minutes: edge.minutes, towards })
    } else if (edge.type === 'walk') {
      legs.push({ type: 'walk', from, to, minutes: edge.minutes, meters: Math.round(distanceKm(from, to) * 1000) })
    } else {
      legs.push({ type: 'branch', from, to, minutes: edge.minutes })
    }
  })
  return legs.map((leg) => ({ ...leg, minutes: Math.round(leg.minutes) }))
}

/**
 * Ids de estaciones de un punto elegido: un lugar (buildPlaces) aporta
 * todas sus estaciones, asi el viaje sale por la linea que mas conviene;
 * una estacion suelta aporta sus ramales (mismo nombre y linea).
 */
function idsOf(stations, ref) {
  if (Array.isArray(ref.stations)) return ref.stations.map((s) => s.stationId)
  return stations.filter((s) => s.lineId === ref.lineId && s.stationName === ref.stationName).map((s) => s.stationId)
}

/**
 * Planifica entre dos estaciones o lugares elegidos. Con
 * { accessibleOnly: true } se sube, se baja y se combina solo en
 * estaciones accesibles; si el origen o el destino no tienen ninguna,
 * devuelve { inaccessible: 'origin' | 'destination' }.
 */
export function planTrip(stations, origin, destination, { accessibleOnly = false } = {}) {
  const byId = new Map(stations.map((s) => [s.stationId, s]))
  const allowed = (id) => !accessibleOnly || byId.get(id)?.accessible === true
  const originIds = idsOf(stations, origin).filter(allowed)
  const targetIds = idsOf(stations, destination).filter(allowed)
  if (originIds.length === 0) return { inaccessible: 'origin' }
  if (targetIds.length === 0) return { inaccessible: 'destination' }
  const result = shortestPath(buildGraph(stations, { accessibleOnly }), originIds, targetIds)
  if (!result) return null
  const legs = toLegs(result, stations)
  return {
    legs,
    minutes: Math.round(result.minutes),
    transfers: legs.filter((l) => l.type !== 'ride').length,
  }
}

/** Enlace a Google Maps en modo transporte publico. */
export function googleMapsUrl(origin, destination) {
  const point = (p) => (typeof p === 'string' ? p : `${Number(p.latitude)},${Number(p.longitude)}`)
  const params = new URLSearchParams({
    api: '1',
    origin: point(origin),
    destination: point(destination),
    travelmode: 'transit',
  })
  return `https://www.google.com/maps/dir/?${params}`
}
