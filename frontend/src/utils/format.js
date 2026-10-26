export function formatRelativeTime(isoString, now = new Date()) {
  const then = new Date(isoString)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.round(diffMs / 60_000)

  if (diffMin < 1) return 'hace un momento'
  if (diffMin < 60) return `hace ${diffMin} min`

  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`

  const diffDays = Math.round(diffHours / 24)
  return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`
}

// La app es del AMBA: la hora se muestra siempre en hora de Buenos Aires,
// en formato 24 hs, aunque quien la mire este en otro huso horario.
export const TIME_ZONE = 'America/Buenos_Aires'

/** 22:50 */
export function formatClock(date) {
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TIME_ZONE,
  })
}

/** sáb 24 oct */
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

/** "Sáb 24 oct": dia y mes abreviados, en hora de Buenos Aires. */
export function formatShortDate(date) {
  return capitalize(
    date
      .toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TIME_ZONE })
      .replace(/[.,]/g, ''),
  )
}

/** "Sábado 24 de octubre": la fecha completa, como se escribe en castellano. */
export function formatDayDate(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIME_ZONE })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  return `${capitalize(parts.weekday)} ${parts.day} de ${parts.month}`
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "1913-12-01" -> "1 de diciembre de 1913" (sin pasar por zonas horarias). */
export function formatLongDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate ?? '')
  if (!match) return null
  const [, year, month, day] = match
  return `${Number(day)} de ${MONTHS[Number(month) - 1]} de ${year}`
}

/** Años completos entre una fecha "AAAA-MM-DD" y hoy. */
export function yearsSince(isoDate, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate ?? '')
  if (!match) return null
  const [, year, month, day] = match.map(Number)
  let years = now.getFullYear() - year
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) years -= 1
  return years
}
