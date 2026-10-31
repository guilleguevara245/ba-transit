/**
 * Mis lugares: Casa, Trabajo y otros lugares guardados en este navegador
 * (y en la cuenta, si hay sesion). Cada lugar es una estacion, para armar
 * el viaje en "Cómo llegar", o una direccion, que abre Google Maps.
 * Las reglas son las mismas que aplica el servidor.
 */

export const PLACES_KEY = 'ba-transit:mis-lugares'
export const PLACES_CHANGED = 'ba-transit:lugares-cambio'
export const MAX_PLACES = 8
export const MAX_NAME = 30
export const MAX_ADDRESS = 120

/** icon: clave de ModeIcon. */
export const PLACE_TYPES = {
  casa: { label: 'Casa', icon: 'CASA' },
  trabajo: { label: 'Trabajo', icon: 'TRABAJO' },
  otro: { label: 'Otro lugar', icon: 'LUGAR' },
}

function cleanText(value, max) {
  if (typeof value !== 'string') return null
  // Caracteres de control (codigos < 32 y 127) como espacios.
  const visible = [...value].map((c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c)).join('')
  const t = visible.replace(/\s+/g, ' ').trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max).trim() : t
}

/** Dentro del AMBA (la misma caja que usa el servidor para el clima). */
function inAmba(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -35.5 && lat <= -34 && lon >= -59.5 && lon <= -57.7
}

/** Un lugar valido o null. */
export function cleanPlace(p) {
  if (!p || !Object.hasOwn(PLACE_TYPES, p.tipo)) return null
  const estacion = Number.isInteger(p.estacion) && p.estacion > 0 ? p.estacion : null
  const direccion = estacion ? null : cleanText(p.direccion, MAX_ADDRESS)
  if (!estacion && !direccion) return null
  const nombre = p.tipo === 'otro' ? (cleanText(p.nombre, MAX_NAME) ?? 'Lugar') : PLACE_TYPES[p.tipo].label
  if (estacion) return { tipo: p.tipo, nombre, estacion, direccion: null }
  // Direccion confirmada: la zona (grilla de 0,05 grados, dentro del AMBA) y la estacion mas cercana.
  const lat = Number(p.lat)
  const lon = Number(p.lon)
  const zoned = p.lat != null && p.lon != null && inAmba(lat, lon)
  const cerca = Number.isInteger(p.cerca) && p.cerca > 0 ? p.cerca : null
  return {
    tipo: p.tipo,
    nombre,
    estacion: null,
    direccion,
    lat: zoned ? Math.round(lat * 20) / 20 : null,
    lon: zoned ? Math.round(lon * 20) / 20 : null,
    cerca,
  }
}

/** Sin invalidos, una sola Casa y un solo Trabajo (vale el primero), hasta MAX_PLACES. */
export function sanitizePlaces(list) {
  const out = []
  const seen = new Set()
  for (const raw of Array.isArray(list) ? list : []) {
    if (out.length >= MAX_PLACES) break
    const p = cleanPlace(raw)
    if (!p) continue
    if (p.tipo !== 'otro') {
      if (seen.has(p.tipo)) continue
      seen.add(p.tipo)
    }
    out.push(p)
  }
  // Casa y Trabajo primero, despues los demas en el orden en que se guardaron.
  const rank = { casa: 0, trabajo: 1, otro: 2 }
  return out.map((p, i) => [p, i]).sort((a, b) => rank[a[0].tipo] - rank[b[0].tipo] || a[1] - b[1]).map(([p]) => p)
}

export function readPlaces() {
  try {
    return sanitizePlaces(JSON.parse(window.localStorage.getItem(PLACES_KEY) ?? '[]'))
  } catch {
    return []
  }
}

/** Guarda la lista entera y avisa (para la pagina y la sincronizacion con la cuenta). */
export function writePlaces(list, { silent = false } = {}) {
  const clean = sanitizePlaces(list)
  try {
    window.localStorage.setItem(PLACES_KEY, JSON.stringify(clean))
  } catch {
    // Sin almacenamiento: duran lo que dure la pagina.
  }
  window.dispatchEvent(new window.CustomEvent(PLACES_CHANGED, { detail: { places: clean, silent } }))
  return clean
}

/** Agrega o reemplaza: Casa y Trabajo se reemplazan; un "otro" reemplaza al de la misma posicion. */
export function savePlace(list, place, index = null) {
  const p = cleanPlace(place)
  if (!p) return sanitizePlaces(list)
  const next = [...list]
  if (index != null && index >= 0 && index < next.length) next[index] = p
  else if (p.tipo !== 'otro' && next.some((x) => x.tipo === p.tipo)) next[next.findIndex((x) => x.tipo === p.tipo)] = p
  else next.push(p)
  return sanitizePlaces(next)
}

const sameTarget = (a, b) => (a.estacion ? a.estacion === b.estacion : a.direccion === b.direccion)

/**
 * Une los lugares del navegador con los de la cuenta. Si este navegador ya
 * estaba sincronizado con esta cuenta, manda la cuenta (asi un lugar
 * borrado en otro dispositivo no vuelve). Si no (lugares guardados antes de
 * entrar), se suman: Casa y Trabajo de la cuenta tienen prioridad.
 */
export function mergePlaces(local, remote, alreadySynced) {
  const r = sanitizePlaces(remote)
  if (alreadySynced) return r
  const merged = [...r]
  for (const p of sanitizePlaces(local)) {
    if (p.tipo !== 'otro' && merged.some((x) => x.tipo === p.tipo)) continue
    if (p.tipo === 'otro' && merged.some((x) => x.tipo === 'otro' && sameTarget(x, p))) continue
    merged.push(p)
  }
  return sanitizePlaces(merged)
}

/** El lugar del planificador (de buildPlaces) que incluye esa estacion. */
export function findStationPlace(options, stationId) {
  if (!stationId) return null
  return options.find((o) => o.stations?.some((s) => s.stationId === stationId)) ?? null
}

/**
 * La zona de una direccion guardada ("Tte Origone 151, Hurlingham" ->
 * "Hurlingham"; la Ciudad queda como "Capital"), o null si no tiene.
 */
export function addressArea(direccion) {
  const parts = String(direccion ?? '').split(',')
  const area = parts.slice(1).join(',').trim()
  if (!area) return null
  return area === 'Ciudad de Buenos Aires' ? 'Capital' : area
}

/** "Casa" -> "casa"; para frases como "De casa al trabajo". */
export function placePhrase(p, preposition) {
  if (p.tipo === 'casa') return preposition === 'de' ? 'De casa' : 'a casa'
  if (p.tipo === 'trabajo') return preposition === 'de' ? 'Del trabajo' : 'al trabajo'
  return preposition === 'de' ? `De ${p.nombre}` : `a ${p.nombre}`
}
