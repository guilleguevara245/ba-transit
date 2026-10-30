/** Titulo de la pestaña con las alertas de tus favoritos (ver hooks/useAlertsTitle.js). */

const BASE_TITLE = 'BA Transit'

/** "(3) BA Transit" con 3 alertas; "BA Transit" sin alertas. */
export function titleWithAlerts(count) {
  return count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE
}

/**
 * Cuantas alertas tocan tus favoritos: las de tus lineas y las de las
 * lineas de tus estaciones (las mismas que cambian su estado en el inicio).
 * Sin favoritos, 0: el numero de la pestaña es para lo tuyo.
 */
export function favoriteAlertCount(alerts, lineIds) {
  const mine = new Set(lineIds)
  if (mine.size === 0) return 0
  return new Set(alerts.filter((a) => mine.has(a.transportLineId)).map((a) => a.id)).size
}
