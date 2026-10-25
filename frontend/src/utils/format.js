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
const TIME_ZONE = 'America/Buenos_Aires'

/** 22:50 */
export function formatClock(date) {
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TIME_ZONE,
  })
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
}
