/** Filtros de "Alertas destacadas", en este orden. */
export const ALERT_FILTERS = [
  { key: 'TODAS', label: 'Todas' },
  { key: 'TREN', label: 'Trenes' },
  { key: 'SUBTE', label: 'Subtes' },
  { key: 'PREMETRO', label: 'Premetro' },
]

export const DEFAULT_VISIBLE = 5

/** Mas recientes primero (sin fecha, al final). */
export function sortByRecent(alerts) {
  return [...alerts].sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0))
}

/** Alertas del filtro elegido; modeOf(alert) da el modo de su linea. */
export function filterAlerts(alerts, filter, modeOf) {
  if (filter === 'TODAS') return alerts
  return alerts.filter((alert) => modeOf(alert) === filter)
}

/** Cantidad de alertas por filtro, para mostrarla en cada boton. */
export function countByFilter(alerts, modeOf) {
  const counts = Object.fromEntries(ALERT_FILTERS.map((f) => [f.key, 0]))
  counts.TODAS = alerts.length
  for (const alert of alerts) {
    const mode = modeOf(alert)
    if (mode in counts) counts[mode] += 1
  }
  return counts
}
