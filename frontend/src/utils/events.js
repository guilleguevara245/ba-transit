import { distanceKm } from './map.js'

/** Etiqueta de cada tipo de evento (ver CityEvent en el backend). */
export const EVENT_KINDS = {
  EVENTO: { label: 'Evento', className: 'event-kind-event' },
  MANIFESTACION: { label: 'Manifestación', className: 'event-kind-protest' },
  OBRA: { label: 'Obra', className: 'event-kind-works' },
  CORTE: { label: 'Corte', className: 'event-kind-closure' },
}

/** Distancia maxima para decir que un evento esta "cerca" de una estacion. */
export const NEAR_STATION_KM = 0.7
/** Distancia maxima de un evento a un tramo medido de una autopista de acceso. */
export const NEAR_ACCESS_KM = 0.5

const TZ = 'America/Buenos_Aires'
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const fmt = (date, options) => new Intl.DateTimeFormat('es-AR', { timeZone: TZ, ...options }).format(date)
const dayKey = (date) => fmt(date, { year: 'numeric', month: '2-digit', day: '2-digit' })
const time = (date) => fmt(date, { hour: 'numeric', minute: '2-digit', hour12: false })

/** "hoy", "mañana" o "el 13 de marzo". */
function dayText(date, now) {
  if (dayKey(date) === dayKey(now)) return 'hoy'
  if (dayKey(date) === dayKey(new Date(now.getTime() + 24 * 3600_000))) return 'mañana'
  const [d, m] = dayKey(date).split('/')
  return `el ${Number(d)} de ${MONTHS[Number(m) - 1]}`
}

const parse = (value) => {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

/**
 * Cuando: "Hoy de 21:00 a 03:00", "Desde mañana a las 8:00", "En curso
 * hasta el 30 de noviembre". Empieza en mayuscula.
 */
export function eventWhen(event, now = new Date()) {
  const start = parse(event.startsAt)
  const end = parse(event.endsAt)
  let text
  if (start && start > now) {
    const day = dayText(start, now)
    const sameDay = end && (dayKey(end) === dayKey(start) || end - start <= 12 * 3600_000)
    text = sameDay ? `${day} de ${time(start)} a ${time(end)}` : `desde ${day} a las ${time(start)}`
    if (end && !sameDay) text += ` hasta ${dayText(end, now)}`
  } else if (end) {
    text = dayKey(end) === dayKey(now) ? `en curso hasta las ${time(end)}` : `en curso hasta ${dayText(end, now)}`
  } else {
    text = 'en curso'
  }
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "HUMBOLDT · AV CORRIENTES" -> "Humboldt · Av Corrientes" (el feed viene en mayusculas). */
export function prettyStreets(text) {
  if (!text) return null
  if (text !== text.toUpperCase()) return text
  return text.toLowerCase().replace(/(^|[\s·(/-])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase())
}

const hasPoint = (e) => Number.isFinite(e.latitude) && Number.isFinite(e.longitude)

/** Eventos a menos de km de un punto (estacion), del mas cercano al mas lejano. */
export function eventsNear(events, point, km = NEAR_STATION_KM) {
  return (events ?? [])
    .filter(hasPoint)
    .map((e) => ({ ...e, distanceKm: distanceKm(point, e) }))
    .filter((e) => e.distanceKm <= km)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

/**
 * Eventos que afectan accesos: marcados a mano (affectsAccesses) o a
 * menos de NEAR_ACCESS_KM de algun punto de los tramos medidos.
 * Devuelve [{ event, access }] (access: nombre de la autopista o null).
 */
export function eventsOnAccesses(events, accesses) {
  const result = []
  for (const event of events ?? []) {
    let access = null
    if (hasPoint(event)) {
      for (const a of accesses ?? []) {
        const near = a.segments.some((s) =>
          (s.geometry ?? []).some(([lat, lon]) => distanceKm(event, { latitude: lat, longitude: lon }) <= NEAR_ACCESS_KM),
        )
        if (near) {
          access = a.name
          break
        }
      }
    }
    if (access || event.affectsAccesses) result.push({ event, access })
  }
  return result
}
