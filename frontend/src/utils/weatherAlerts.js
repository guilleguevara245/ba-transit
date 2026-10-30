/** Textos y colores de las alertas del SMN (ver WeatherAlertService en el backend). */
export const ALERT_LEVELS = {
  AMARILLA: { label: 'Alerta amarilla', tag: 'Amarilla', className: 'weather-alert-yellow' },
  NARANJA: { label: 'Alerta naranja', tag: 'Naranja', className: 'weather-alert-orange' },
  ROJA: { label: 'Alerta roja', tag: 'Roja', className: 'weather-alert-red' },
}

export const ALERT_KINDS = {
  TORMENTAS: 'tormentas',
  LLUVIAS: 'lluvias',
  CALOR: 'calor extremo',
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const fmt = (date, options) =>
  new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Buenos_Aires', ...options }).format(date)
const dayKey = (date) => fmt(date, { year: 'numeric', month: '2-digit', day: '2-digit' })

/** "las 21:00", "mañana a las 21:00" o "el martes a las 21:00", relativo a hoy en Buenos Aires. */
function when(date, now) {
  const time = `las ${fmt(date, { hour: 'numeric', minute: '2-digit', hour12: false })}`
  if (dayKey(date) === dayKey(now)) return time
  if (dayKey(date) === dayKey(new Date(now.getTime() + 24 * 3600_000))) return `mañana a ${time}`
  const [d, m, y] = dayKey(date).split('/')
  return `el ${WEEKDAYS[new Date(`${y}-${m}-${d}T12:00:00`).getDay()]} a ${time}`
}

const parse = (value) => {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

/** "hasta mañana a las 06:00": hasta cuando rige la alerta. */
export function untilText(expires, now = new Date()) {
  const end = parse(expires)
  return end ? `hasta ${when(end, now)}` : null
}

/**
 * Periodo de la alerta: si todavia no empezo, "desde mañana a las 21:00
 * hasta el martes a las 02:59"; si ya rige, solo el "hasta".
 */
export function periodText(alert, now = new Date()) {
  const start = parse(alert.onset)
  const until = untilText(alert.expires, now)
  if (start && start > now) return [`desde ${when(start, now)}`, until].filter(Boolean).join(' ')
  return until
}

/** "Alerta amarilla por tormentas" (o "Alerta por tormentas" con withLevel = false, junto a la etiqueta de color). */
export function alertTitle(alert, withLevel = true) {
  const level = withLevel ? (ALERT_LEVELS[alert.level]?.label ?? 'Alerta') : 'Alerta'
  const kind = ALERT_KINDS[alert.kind]
  return kind ? `${level} por ${kind}` : alert.title || level
}

/** Icono de WeatherIcon para cada tipo de alerta. */
export const ALERT_ICONS = { TORMENTAS: 'storm', LLUVIAS: 'rain', CALOR: 'heat' }

const TIPS = {
  TORMENTAS: 'llevá paraguas y salí con tiempo: puede haber demoras',
  LLUVIAS: 'llevá paraguas y salí con tiempo: puede haber demoras',
  CALOR: 'llevá agua y evitá el sol del mediodía',
}

/**
 * Consejo para quien va a viajar, segun el tipo de alerta y cuando
 * empieza: "Si viajás mañana, llevá paraguas...". Si ya rige: "Si vas a
 * viajar, ...".
 */
export function travelTip(alert, now = new Date()) {
  const tip = TIPS[alert.kind]
  if (!tip) return null
  const start = parse(alert.onset)
  let lead = 'Si vas a viajar'
  if (start && start > now) {
    if (dayKey(start) === dayKey(now)) lead = 'Si viajás hoy'
    else if (dayKey(start) === dayKey(new Date(now.getTime() + 24 * 3600_000))) lead = 'Si viajás mañana'
    else {
      const [d, m, y] = dayKey(start).split('/')
      lead = `Si viajás el ${WEEKDAYS[new Date(`${y}-${m}-${d}T12:00:00`).getDay()]}`
    }
  }
  return `${lead}, ${tip}.`
}

/**
 * Clave para recordar que cerraste una alerta: tipo, nivel y dia (en
 * Buenos Aires). El SMN reemplaza sus alertas seguido (cambia el horario y
 * con eso el id), asi que el id no sirve: cerrada la naranja por tormentas
 * de hoy, no vuelve hoy aunque la renueven. Vuelve si sube de nivel o al
 * dia siguiente.
 */
export function dismissKey(alert, now = new Date()) {
  return `${alert.kind}:${alert.level}:${dayKey(now)}`
}

const LEVEL_RANK = { AMARILLA: 1, NARANJA: 2, ROJA: 3 }

/**
 * Junta las alertas de tus lugares: lists = [{ place: { label }, alerts }].
 * Una por tipo (la de mayor nivel), la mas grave primero. where: el lugar al que afecta ("Trabajo"),
 * o null si afecta a todos tus lugares (o hay uno solo).
 */
export function alertsForPlaces(lists) {
  const byKind = new Map()
  for (const { place, alerts } of lists) {
    for (const alert of alerts ?? []) {
      const current = byKind.get(alert.kind)
      const rank = LEVEL_RANK[alert.level] ?? 0
      if (!current || rank > current.rank) {
        byKind.set(alert.kind, { alert, rank, places: [place.label] })
      } else if (rank === current.rank && !current.places.includes(place.label)) {
        current.places.push(place.label)
      }
    }
  }
  // La mas grave arriba.
  return [...byKind.values()]
    .sort((a, b) => b.rank - a.rank)
    .map(({ alert, places }) => ({
      ...alert,
      where: lists.length > 1 && places.length < lists.length ? places.join(' y ') : null,
    }))
}
