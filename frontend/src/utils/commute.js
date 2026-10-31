import { buildPlaces, linesLabel } from './places.js'
import { planTrip } from './planner.js'
import { findStationPlace } from './placesStore.js'

/**
 * El viaje de Casa al Trabajo para "Tu dia": cuanto tarda y por que
 * lineas, con el enlace a Como llegar. Usa la estacion guardada o, si es
 * una direccion confirmada, la estacion mas cercana.
 */

/** La estacion de un lugar guardado (la suya o la mas cercana a la direccion). */
const stationOf = (place) => place?.estacion ?? place?.cerca ?? null

/** Si hace falta pedir las estaciones: Casa y Trabajo tienen estacion. */
export function hasCommute(places = []) {
  const home = places.find((p) => p.tipo === 'casa')
  const work = places.find((p) => p.tipo === 'trabajo')
  return Boolean(stationOf(home) && stationOf(work))
}

/**
 * { minutes, lines: 'Líneas B y Sarmiento', link, nearest } o null si no
 * hay Casa y Trabajo con estacion, son la misma o no hay camino.
 * nearest: alguna punta es la estacion mas cercana a una direccion.
 */
export function commuteTrip(places = [], stations = null) {
  if (!stations || !hasCommute(places)) return null
  const home = places.find((p) => p.tipo === 'casa')
  const work = places.find((p) => p.tipo === 'trabajo')
  const options = buildPlaces(stations)
  const from = findStationPlace(options, stationOf(home))
  const to = findStationPlace(options, stationOf(work))
  if (!from || !to || from.stationId === to.stationId) return null
  const plan = planTrip(stations, from, to)
  if (!plan?.legs) return null
  const lines = []
  for (const leg of plan.legs) {
    if (leg.type === 'ride' && !lines.some((l) => l.lineId === leg.from.lineId)) {
      lines.push({ lineId: leg.from.lineId, lineName: leg.from.lineName })
    }
  }
  if (lines.length === 0) return null
  return {
    minutes: plan.minutes,
    lines: linesLabel(lines),
    link: `/como-llegar?desde=${from.stationId}&hasta=${to.stationId}`,
    nearest: !home.estacion || !work.estacion,
  }
}
