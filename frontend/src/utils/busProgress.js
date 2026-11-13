/**
 * Donde va un colectivo en vivo sobre el recorrido de su sentido: la
 * proxima parada y cuantos minutos le faltan segun los minutos entre
 * paradas del horario (como en el backend, StopArrivals).
 */

/** Mas lejos que esto del recorrido dibujado no esta en el recorrido (garage, terminal, otro ramal). */
const OFF_SHAPE_METERS = 80
/** Sin recorrido dibujado, la distancia maxima a la linea entre paradas. */
const OFF_STOPS_METERS = 400
/** A menos de esto de la parada, "llegando". */
const ARRIVING_METERS = 120

export function metersBetween(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** El punto del tramo a-b mas cercano: cuanto avanzo en el tramo (0 a 1) y a cuantos metros esta. */
function project(aLat, aLon, bLat, bLon, lat, lon) {
  const cos = Math.cos((lat * Math.PI) / 180)
  const ax = aLon * cos
  const bx = bLon * cos
  const dx = bx - ax
  const dy = bLat - aLat
  const length2 = dx * dx + dy * dy
  let t = length2 === 0 ? 0 : ((lon * cos - ax) * dx + (lat - aLat) * dy) / length2
  t = Math.max(0, Math.min(1, t))
  return { t, meters: metersBetween(lat, lon, aLat + t * dy, (ax + t * dx) / cos) }
}

/**
 * La proxima parada del colectivo en el sentido direction ({ shape,
 * stops, minutes }): { stop, index, minutes, arriving }, o null si no
 * esta sobre el recorrido. minutes: null si el horario no trae los
 * minutos de esas paradas.
 */
export function nextStop(direction, lat, lon, ageSeconds = 0) {
  const stops = direction?.stops ?? []
  if (stops.length < 2) return null
  const shape = direction.shape ?? []
  if (shape.length >= 2) {
    let closest = Infinity
    for (let i = 0; i < shape.length - 1; i++) {
      closest = Math.min(closest, project(shape[i][0], shape[i][1], shape[i + 1][0], shape[i + 1][1], lat, lon).meters)
    }
    if (closest > OFF_SHAPE_METERS) return null
  }
  let best = null
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    const p = project(a.latitude, a.longitude, b.latitude, b.longitude, lat, lon)
    if (!best || p.meters < best.meters) best = { segment: i, ...p }
  }
  if (best.meters > OFF_STOPS_METERS) return null
  const index = best.segment + 1
  const stop = stops[index]
  const arriving = metersBetween(lat, lon, stop.latitude, stop.longitude) <= ARRIVING_METERS
  const from = direction.minutes?.[best.segment]
  const to = direction.minutes?.[index]
  let minutes = null
  if (arriving) {
    minutes = 0
  } else if (from != null && to != null) {
    minutes = Math.max(1, Math.round(to - (from + best.t * (to - from)) - ageSeconds / 60))
  }
  return { stop, index, minutes, arriving }
}
