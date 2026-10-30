import { PREFS_CHANGED } from './prefsEvents.js'
import { toGrid } from './weatherPlaces.js'

/**
 * La zona del clima: para quien no tiene Casa guardada como estacion.
 * Se guarda solo el nombre y la celda de la grilla (unos 5 km), nunca el
 * punto exacto. Va con las preferencias de la cuenta (se sincroniza).
 */
export const ZONE_KEY = 'ba-transit:zona-clima'
export const ZONE_CHANGED = 'ba-transit:zona-clima-cambio'
export const MAX_ZONE_NAME = 40

/** El AMBA con margen (el mismo recuadro que acepta el servidor). */
const AREA = { minLat: -35.5, maxLat: -34.0, minLon: -59.5, maxLon: -57.7 }

/** { nombre, lat, lon } valida y redondeada a la grilla, o null. */
export function cleanZone(z) {
  if (!z || typeof z.nombre !== 'string') return null
  const nombre = z.nombre.replace(/\s+/g, ' ').trim().slice(0, MAX_ZONE_NAME)
  const lat = Number(z.lat)
  const lon = Number(z.lon)
  if (!nombre || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < AREA.minLat || lat > AREA.maxLat || lon < AREA.minLon || lon > AREA.maxLon) return null
  return { nombre, lat: toGrid(lat), lon: toGrid(lon) }
}

export function readZone() {
  try {
    return cleanZone(JSON.parse(window.localStorage.getItem(ZONE_KEY) ?? 'null'))
  } catch {
    return null
  }
}

/** Guarda la zona (null la borra). silent: sin subirla a la cuenta (viene de la cuenta). */
export function saveZone(zone, { silent = false } = {}) {
  const clean = cleanZone(zone)
  try {
    if (clean) window.localStorage.setItem(ZONE_KEY, JSON.stringify(clean))
    else window.localStorage.removeItem(ZONE_KEY)
  } catch {
    // Sin almacenamiento: dura hasta recargar (el evento igual avisa).
  }
  window.dispatchEvent(new window.CustomEvent(ZONE_CHANGED, { detail: clean }))
  if (!silent) window.dispatchEvent(new window.CustomEvent(PREFS_CHANGED))
  return clean
}
