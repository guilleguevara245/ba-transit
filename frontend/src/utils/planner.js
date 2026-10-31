import { SUBTE_TRANSFERS, distanceKm } from './map.js'
import { normalizeText } from './stationSearch.js'
import { segmentMinutes } from './travelTime.js'

/** Espera promedio al subir a otra linea (o cambiar de ramal). */
export const WAIT_MINUTES = 4
/** Hasta esta distancia se propone caminar entre estaciones de lineas distintas. */
export const MAX_WALK_KM = 0.4
const WALK_KMH = 4.5
/** Caminando por las calles se recorre mas que en linea recta (unas 1,3 veces). */
const WALK_DETOUR = 1.3
/** Desde una direccion se camina hasta una estacion a menos de esta distancia (en linea recta). */
export const MAX_ACCESS_KM = 2
/** Cuantas estaciones cercanas (por nombre) se prueban para salir o llegar a una direccion. */
const ACCESS_PLACES = 4

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
 *
 * startCost / endCost (opcionales): minutos extra para empezar en un
 * origen o terminar en un destino (caminar desde o hasta una direccion).
 */
export function shortestPath(graph, originIds, targetIds, { startCost = () => 0, endCost = () => 0 } = {}) {
  const targets = new Set(targetIds)
  const dist = new Map()
  const prev = new Map()
  const queue = []
  let best = null
  for (const id of originIds) {
    const cost = startCost(id)
    if (cost < (dist.get(id) ?? Infinity)) {
      dist.set(id, cost)
      queue.push([cost, id])
    }
  }
  while (queue.length > 0) {
    queue.sort((x, y) => x[0] - y[0])
    const [d, id] = queue.shift()
    // Lo que queda en la cola ya no puede mejorar el mejor destino encontrado.
    if (best && d >= best.total) break
    if (d > (dist.get(id) ?? Infinity)) continue
    if (targets.has(id)) {
      const total = d + endCost(id)
      if (!best || total < best.total) best = { id, total }
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
  if (!best) return null
  const path = [best.id]
  while (prev.has(path[0])) path.unshift(prev.get(path[0]).from)
  return { path, minutes: best.total, edges: path.slice(1).map((to) => prev.get(to).edge) }
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

/** Una direccion elegida (de Georef): { type: 'address', text, area, lat, lon }. */
export const isAddress = (ref) => ref?.type === 'address'

/** Minutos a pie para una distancia en linea recta (contando que las calles dan vueltas). */
export function walkMinutes(km) {
  return Math.max(1, Math.round(((km * WALK_DETOUR) / WALK_KMH) * 60))
}

/**
 * Las estaciones a menos de maxKm de una direccion, de la mas cercana a
 * la mas lejana: todas las de los ACCESS_PLACES nombres mas cercanos
 * (Retiro cuenta una vez aunque tenga cinco lineas).
 */
export function nearbyStations(stations, { lat, lon }, maxKm = MAX_ACCESS_KM) {
  const point = { latitude: lat, longitude: lon }
  const near = (stations ?? [])
    .map((station) => ({ station, km: distanceKm(point, station) }))
    .filter(({ km }) => Number.isFinite(km) && km <= maxKm)
    .sort((a, b) => a.km - b.km)
  const names = []
  return near.filter(({ station }) => {
    const name = normalizeText(station.stationName)
    if (names.includes(name)) return true
    if (names.length >= ACCESS_PLACES) return false
    names.push(name)
    return true
  })
}

/**
 * Por donde se entra (o sale) de la red desde un punto elegido, con los
 * minutos a pie: un lugar (buildPlaces) aporta todas sus estaciones, asi
 * el viaje sale por la linea que mas conviene; una estacion suelta aporta
 * sus ramales (mismo nombre y linea); una direccion, las estaciones
 * cercanas con lo que se tarda caminando hasta cada una.
 */
function entriesOf(stations, ref) {
  if (isAddress(ref)) {
    return nearbyStations(stations, ref).map(({ station, km }) => ({ id: station.stationId, km }))
  }
  const ids = Array.isArray(ref.stations)
    ? ref.stations.map((s) => s.stationId)
    : stations.filter((s) => s.lineId === ref.lineId && s.stationName === ref.stationName).map((s) => s.stationId)
  return ids.map((id) => ({ id, km: 0 }))
}

/** El tramo a pie entre una direccion y su estacion. */
function addressLeg(type, address, station, km) {
  return type === 'access'
    ? { type, from: address, to: station, km, minutes: walkMinutes(km) }
    : { type, from: station, to: address, km, minutes: walkMinutes(km) }
}

/**
 * Planifica entre dos estaciones, lugares o direcciones elegidos. Con una
 * direccion, el viaje empieza (o termina) caminando hasta una estacion
 * cercana: la que de el viaje mas corto, no siempre la mas cercana.
 *
 * Con { accessibleOnly: true } se sube, se baja y se combina solo en
 * estaciones accesibles; si el origen o el destino no tienen ninguna,
 * devuelve { inaccessible: 'origin' | 'destination' }. Si una direccion
 * no tiene estaciones a menos de MAX_ACCESS_KM, devuelve
 * { far: 'origin' | 'destination' }.
 */
export function planTrip(stations, origin, destination, { accessibleOnly = false } = {}) {
  const byId = new Map(stations.map((s) => [s.stationId, s]))
  const allowed = ({ id }) => !accessibleOnly || byId.get(id)?.accessible === true
  const originAll = entriesOf(stations, origin)
  const targetAll = entriesOf(stations, destination)
  if (originAll.length === 0 && isAddress(origin)) return { far: 'origin' }
  if (targetAll.length === 0 && isAddress(destination)) return { far: 'destination' }
  const originEntries = originAll.filter(allowed)
  const targetEntries = targetAll.filter(allowed)
  if (originEntries.length === 0) return { inaccessible: 'origin' }
  if (targetEntries.length === 0) return { inaccessible: 'destination' }

  const kmTo = (entries) => new Map(entries.map((e) => [e.id, e.km]))
  const startKm = kmTo(originEntries)
  const endKm = kmTo(targetEntries)
  const cost = (km) => (km > 0 ? walkMinutes(km) : 0)
  const result = shortestPath(
    buildGraph(stations, { accessibleOnly }),
    originEntries.map((e) => e.id),
    targetEntries.map((e) => e.id),
    { startCost: (id) => cost(startKm.get(id)), endCost: (id) => cost(endKm.get(id)) },
  )
  if (!result) return null

  const legs = toLegs(result, stations)
  const first = result.path[0]
  const last = result.path[result.path.length - 1]
  if (isAddress(origin)) legs.unshift(addressLeg('access', origin, byId.get(first), startKm.get(first)))
  if (isAddress(destination)) legs.push(addressLeg('egress', destination, byId.get(last), endKm.get(last)))
  return {
    legs,
    // La suma de los tramos (ya redondeados), asi la hora de llegada coincide con el total.
    minutes: legs.reduce((sum, leg) => sum + leg.minutes, 0),
    transfers: legs.filter((l) => l.type === 'walk' || l.type === 'branch').length,
  }
}

/**
 * Si conviene ir caminando: la distancia en linea recta entre los dos
 * puntos (estaciones o direcciones) y los minutos a pie, o null si estan
 * a mas de maxKm.
 */
export function walkingAlternative(origin, destination, maxKm = MAX_ACCESS_KM) {
  const point = (p) => (isAddress(p) ? { latitude: p.lat, longitude: p.lon } : p)
  const km = distanceKm(point(origin), point(destination))
  if (!Number.isFinite(km) || km > maxKm) return null
  return { km, minutes: walkMinutes(km) }
}

/** Enlace a Google Maps en modo transporte publico (texto, direccion elegida o estacion). */
export function googleMapsUrl(origin, destination) {
  const point = (p) => {
    if (typeof p === 'string') return p
    if (isAddress(p)) return [p.text, p.area, 'Argentina'].filter(Boolean).join(', ')
    return `${Number(p.latitude)},${Number(p.longitude)}`
  }
  const params = new URLSearchParams({
    api: '1',
    origin: point(origin),
    destination: point(destination),
    travelmode: 'transit',
  })
  return `https://www.google.com/maps/dir/?${params}`
}
