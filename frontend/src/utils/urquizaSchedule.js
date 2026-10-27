import { URQUIZA_PATTERNS, URQUIZA_STATIONS, URQUIZA_TRIPS, URQUIZA_VALID_FROM } from '../data/urquizaSchedule.js'
import { formatLongDate } from './format.js'
import { isStale } from './staleness.js'
import { holidayOn, localDateKey } from './holidays.js'

const TIME_ZONE = 'America/Argentina/Buenos_Aires'
const DAY = 24 * 60
/** Hasta cuantos trenes se muestran por sentido. */
const MAX_TRAINS = 3
/** Si el proximo tren tarda mas que esto, se muestra la hora en vez de los minutos. */
const SHOW_CLOCK_AFTER = 60

const normalize = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

/** Posicion de la estacion de Lacroze (0) a Lemos (22), o -1. */
export function urquizaStationIndex(stationName) {
  const key = normalize(stationName ?? '')
  return URQUIZA_STATIONS.findIndex((s) => normalize(s) === key)
}

/** Minutos desde las 0 h de hoy en Buenos Aires. */
function minutesOfDay(now) {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false })
    .format(now)
    .split(':')
    .map(Number)
  return (h % 24) * 60 + m
}

/** HABIL, SABADO o DOMINGO (domingos y feriados) para un dia calendario. */
export function urquizaDayType(date) {
  if (holidayOn(date)) return 'DOMINGO'
  const [y, m, d] = localDateKey(date).split('-').map(Number)
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return weekday === 0 ? 'DOMINGO' : weekday === 6 ? 'SABADO' : 'HABIL'
}

const clock = (minutes) => {
  const t = ((Math.round(minutes) % DAY) + DAY) % DAY
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

/** Pasadas por la estacion de un sentido en un dia, en minutos desde las 0 h de ese dia. */
function passes(dayType, direction, index) {
  const flat = URQUIZA_TRIPS[dayType][direction]
  // Hacia Lemos se recorre en el orden de la lista; hacia Lacroze, al reves.
  const position = direction === 'lemos' ? index : URQUIZA_STATIONS.length - 1 - index
  const result = []
  for (let i = 0; i < flat.length; i += 2) result.push(flat[i] + URQUIZA_PATTERNS[flat[i + 1]][position])
  return result
}

/**
 * Proximos trenes del Urquiza en una estacion segun el horario de
 * Metrovias, con la misma forma que el horario del subte:
 * { available, source, directions: [{ towards, arrivals: [{ minutes }], label }] }.
 * Tiene en cuenta los viajes de ayer que pasan despues de medianoche y los
 * de mañana (el servicio nocturno sale a la 1:00, 2:40, etc.).
 */
export function urquizaNextTrains(stationName, now = new Date()) {
  const index = urquizaStationIndex(stationName)
  if (index < 0) return null
  const nowMinutes = minutesOfDay(now)
  const days = [
    [new Date(now.getTime() - DAY * 60_000), -DAY],
    [now, 0],
    [new Date(now.getTime() + DAY * 60_000), DAY],
  ]
  const directions = []
  for (const [direction, towards, terminal] of [
    ['lemos', 'General Lemos', URQUIZA_STATIONS.length - 1],
    ['lacroze', 'Federico Lacroze', 0],
  ]) {
    if (index === terminal) continue // el tren termina aca
    const upcoming = days
      .flatMap(([date, shift]) => passes(urquizaDayType(date), direction, index).map((t) => t + shift - nowMinutes))
      .filter((m) => m >= 0)
      .sort((a, b) => a - b)
      .slice(0, MAX_TRAINS)
    if (upcoming.length === 0) continue
    const label =
      upcoming[0] > SHOW_CLOCK_AFTER
        ? `Próximo tren ${clock(nowMinutes + upcoming[0])}`
        : upcoming.map((m) => (m < 1 ? 'llegando' : `${m} min`)).join(' · ')
    directions.push({ towards, arrivals: upcoming.map((minutes) => ({ minutes })), label })
  }
  return {
    available: directions.length > 0,
    source: `Metrovías, horario vigente desde el ${formatLongDate(URQUIZA_VALID_FROM)}`,
    stale: isStale('urquiza', now),
    directions,
  }
}
