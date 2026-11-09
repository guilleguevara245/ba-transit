import { easeInOut, roughKm } from './glide.js'
import { reducedMotion } from './motion.js'

/**
 * Aviones en vivo: entre una actualizacion y la siguiente (30 segundos)
 * cada avion en vuelo sigue avanzando con su rumbo y su velocidad, en vez
 * de quedar quieto y saltar. Cuando llega la posicion nueva, se acomoda de
 * a poco desde donde se lo estaba mostrando.
 */
// Cada cuanto se mueven (15 por segundo alcanza: de lejos avanzan un par de pixeles por segundo).
const STEP_MS = 66
// Si deja de llegar la posicion, no se lo sigue moviendo mas que esto.
export const MAX_DRIFT_S = 45
// Lo que tarda en acomodarse a la posicion nueva.
const BLEND_MS = 1600
// Una diferencia mayor no se acomoda: salta (otro avion con el mismo codigo, un dato corregido).
const MAX_BLEND_KM = 5

const ships = new Map()
let frame = null
let last = 0

/** El punto a km kilometros de from ([lat, lon]) yendo con rumbo heading (grados, 0 = norte). */
export function displacement([lat, lon], heading, km) {
  const rad = (heading * Math.PI) / 180
  const dLat = (km * Math.cos(rad)) / 111.32
  const dLon = (km * Math.sin(rad)) / (111.32 * Math.cos((lat * Math.PI) / 180))
  return [lat + dLat, lon + dLon]
}

/** Donde mostrar el avion a now (ms): lo que avanzo desde la ultima posicion, mas lo que falta acomodar. */
export function positionAt(state, now) {
  const elapsed = now - state.start
  const seconds = Math.min(Math.max(elapsed, 0) / 1000, MAX_DRIFT_S)
  const km = state.speed ? (state.speed * seconds) / 3600 : 0
  const point = km ? displacement(state.base, state.heading, km) : state.base
  const left = 1 - easeInOut(Math.min(1, Math.max(elapsed, 0) / BLEND_MS))
  return [point[0] + state.offset[0] * left, point[1] + state.offset[1] * left]
}

/** Ya no se mueve: quieto (en tierra o sin rumbo) o paso el tiempo maximo, y ya se acomodo. */
const settled = (state, now) => now - state.start > (state.speed ? MAX_DRIFT_S * 1000 : BLEND_MS)

function tick(now) {
  if (now - last >= STEP_MS) {
    last = now
    for (const [layer, state] of ships) {
      layer.setLatLng(positionAt(state, now))
      if (settled(state, now)) ships.delete(layer)
    }
  }
  frame = ships.size > 0 ? window.requestAnimationFrame(tick) : null
}

/**
 * Nueva posicion de un avion (position [lat, lon], heading en grados,
 * speed en km/h; moving: si esta volando). Sigue desde donde se lo esta
 * mostrando.
 */
export function cruiseTo(layer, { position, heading, speed, moving }) {
  if (reducedMotion() || !layer._map) {
    ships.delete(layer)
    layer.setLatLng(position)
    return
  }
  const now = performance.now()
  const shown = layer.getLatLng()
  const near = roughKm([shown.lat, shown.lng], position) <= MAX_BLEND_KM
  const offset = near ? [shown.lat - position[0], shown.lng - position[1]] : [0, 0]
  const flying = moving && heading != null && speed > 0
  ships.set(layer, { base: position, heading: heading ?? 0, speed: flying ? speed : 0, start: now, offset })
  if (frame === null) frame = window.requestAnimationFrame(tick)
}

/** El avion se saca del mapa: deja de moverse. */
export function stopCruise(layer) {
  ships.delete(layer)
}
