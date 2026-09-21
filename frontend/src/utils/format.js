export function formatRelativeTime(isoString) {
  const then = new Date(isoString)
  const diffMs = Date.now() - then.getTime()
  const diffMin = Math.round(diffMs / 60_000)

  if (diffMin < 1) return 'hace un momento'
  if (diffMin < 60) return `hace ${diffMin} min`

  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`

  const diffDays = Math.round(diffHours / 24)
  return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
}
