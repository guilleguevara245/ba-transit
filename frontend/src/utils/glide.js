import { reducedMotion } from './motion.js'

/**
 * Desliza marcadores de Leaflet (colectivos, aviones) a su nueva posicion
 * en vez de hacerlos saltar. Un solo requestAnimationFrame mueve todos los
 * que estan en camino, con setLatLng directo sobre la capa (sin pasar por
 * React en cada cuadro).
 */
export const GLIDE_MS = 1600
// Mas lejos que esto no es un movimiento sino otro viaje o un dato corregido: salta.
const MAX_GLIDE_KM = 2

const active = new Map()
let frame = null

/** Suave al arrancar y al frenar. */
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/** Distancia aproximada en km entre dos puntos [lat, lon] (alcanza para distancias cortas). */
export function roughKm([lat1, lon1], [lat2, lon2]) {
  const dLat = (lat2 - lat1) * 111.32
  const dLon = (lon2 - lon1) * 111.32 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180))
  return Math.hypot(dLat, dLon)
}

/** El punto a la fraccion t (0 a 1) del camino entre from y to. */
export function lerpPoint(from, to, t) {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]
}

function step(now) {
  for (const [layer, glide] of active) {
    const t = Math.min(1, (now - glide.start) / glide.duration)
    layer.setLatLng(lerpPoint(glide.from, glide.to, easeInOut(t)))
    if (t === 1) active.delete(layer)
  }
  frame = active.size > 0 ? window.requestAnimationFrame(step) : null
}

/** Mueve la capa hasta to ([lat, lon]): deslizandose, o de una si no corresponde animar. */
export function glideTo(layer, to, { animate = true, duration = GLIDE_MS } = {}) {
  const current = layer.getLatLng()
  const from = [current.lat, current.lng]
  if (from[0] === to[0] && from[1] === to[1]) return
  if (!animate || reducedMotion() || !layer._map || document.hidden || roughKm(from, to) > MAX_GLIDE_KM) {
    active.delete(layer)
    layer.setLatLng(to)
    return
  }
  active.set(layer, { from, to, start: performance.now(), duration })
  if (frame === null) frame = window.requestAnimationFrame(step)
}

/** La capa se saca del mapa: deja de moverse. */
export function stopGlide(layer) {
  active.delete(layer)
}

function pathOf(layer) {
  const path = layer?.getElement?.()
  return path?.getTotalLength && !reducedMotion() ? path : null
}

function resetPath(path) {
  path.style.opacity = ''
  path.style.transition = ''
  path.style.strokeDasharray = ''
  path.style.strokeDashoffset = ''
}

/** Esconde el trazo de una linea del mapa (SVG) hasta que se dibuje. Devuelve como volver atras. */
export function hidePath(layer) {
  const path = pathOf(layer)
  if (!path) return () => {}
  // Con opacidad y no con el trazo: si el mapa cambia de zoom antes de dibujarse, el largo cambia.
  path.style.opacity = '0'
  return () => resetPath(path)
}

/**
 * Dibuja una linea del mapa de punta a punta, una vez. Se anima el trazo
 * (stroke-dashoffset) y al terminar se le devuelve su estilo, asi una
 * linea punteada sigue punteada.
 */
export function drawPath(layer, { duration = 1300 } = {}) {
  const path = pathOf(layer)
  if (!path) return () => {}
  const length = path.getTotalLength()
  if (!length) return () => resetPath(path)
  let timer = null
  const done = () => {
    window.clearTimeout(timer)
    path.removeEventListener('transitionend', done)
    resetPath(path)
  }
  path.style.transition = 'none'
  path.style.strokeDasharray = `${length}`
  path.style.strokeDashoffset = `${length}`
  path.style.opacity = ''
  path.getBoundingClientRect()
  path.style.transition = `stroke-dashoffset ${duration}ms ease-in-out`
  path.style.strokeDashoffset = '0'
  path.addEventListener('transitionend', done)
  timer = window.setTimeout(done, duration + 150)
  return done
}
