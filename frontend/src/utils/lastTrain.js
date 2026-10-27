import { holidayOn, localDateKey } from './holidays.js'
import { lastTrainsFor, tripMinutesFor } from './serviceHours.js'
import { segmentMinutes } from './travelTime.js'

/** Hasta esta hora, de madrugada, todavia cuenta el servicio del dia anterior. */
const NIGHT_CUTOFF_HOUR = 4

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  // "00:20" es despues de medianoche del mismo dia de servicio.
  return (h < NIGHT_CUTOFF_HOUR ? h + 24 : h) * 60 + m
}

const toClock = (minutes) => {
  const total = Math.round(minutes) % (24 * 60)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

const sameName = (a, b) => a === b || a.startsWith(b) || b.startsWith(a)

/**
 * Tipo de dia del servicio (0 lun-vie, 1 sabado, 2 domingo o feriado),
 * en hora de Buenos Aires. De madrugada cuenta el dia anterior.
 */
export function serviceDayType(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Buenos_Aires', hour: '2-digit', hour12: false }).format(now),
  )
  const day = hour < NIGHT_CUTOFF_HOUR ? new Date(now.getTime() - (hour + 1) * 3600_000) : now
  if (holidayOn(day)) return 2
  const [y, m, d] = localDateKey(day).split('-').map(Number)
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return weekday === 0 ? 2 : weekday === 6 ? 1 : 0
}

/**
 * Ultimo tren que pasa por una estacion en cada sentido (subte, premetro
 * y Urquiza): el horario de salida de la cabecera mas el tiempo estimado de
 * viaje hasta la estacion. Devuelve [{ towards, time }] o null si la
 * linea no tiene horarios cargados.
 *
 * branch: estaciones del ramal ordenadas por recorrido.
 */
export function lastTrainsAt(lineCode, branch, station, now = new Date()) {
  const departures = lastTrainsFor(lineCode)
  if (!departures || branch.length < 2) return null
  const dayType = serviceDayType(now)
  const index = branch.findIndex((s) => s.stationId === station.stationId)
  if (index < 0) return null

  const ends = [branch[0], branch[branch.length - 1]]
  const result = []
  for (const [endIndex, end] of ends.entries()) {
    const departure = departures.find((d) => sameName(d.from, end.stationName))
    if (!departure) continue
    const other = ends[1 - endIndex]
    if (other.stationId === station.stationId) continue // el tren termina aca
    // Tiempo desde la cabecera hasta la estacion.
    const path = endIndex === 0 ? branch.slice(0, index + 1) : branch.slice(index).reverse()
    let minutes = 0
    for (let i = 0; i < path.length - 1; i++) minutes += segmentMinutes(path[i], path[i + 1], 'SUBTE')
    // Si el operador informa el tiempo entre cabeceras, se escala a ese total.
    const total = tripMinutesFor(lineCode)
    if (total) {
      let whole = 0
      for (let i = 0; i < branch.length - 1; i++) whole += segmentMinutes(branch[i], branch[i + 1], 'SUBTE')
      minutes = whole > 0 ? (minutes / whole) * total : 0
    }
    result.push({ towards: other.stationName, time: toClock(toMinutes(departure.times[dayType]) + minutes) })
  }
  return result
}
