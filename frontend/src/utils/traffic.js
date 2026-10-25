/**
 * Estados de transito que devuelve /api/v1/accesos (ver AccessService
 * en el backend) con su texto y color.
 */
export const TRAFFIC_STATUS = {
  FLUIDO: { label: 'Fluido', color: '#2f8a3c' },
  DEMORADO: { label: 'Demorado', color: '#d08a0a' },
  CONGESTIONADO: { label: 'Congestionado', color: '#c23b34' },
  CORTADO: { label: 'Cortado', color: '#17171a' },
  SIN_DATOS: { label: 'Sin datos', color: '#a3a097' },
}

export function trafficStatus(code) {
  return TRAFFIC_STATUS[code] ?? TRAFFIC_STATUS.SIN_DATOS
}

/** Porcentaje (0-100) de la velocidad sin transito al que se circula. */
export function speedPercent(segment) {
  const { currentSpeed, freeFlowSpeed } = segment
  if (!Number.isFinite(currentSpeed) || !Number.isFinite(freeFlowSpeed) || freeFlowSpeed <= 0) return null
  return Math.max(0, Math.min(100, Math.round((currentSpeed / freeFlowSpeed) * 100)))
}

/**
 * Estado general de un acceso: el peor de sus tramos con datos (un
 * corte pesa mas que una congestion).
 */
const SEVERITY = ['FLUIDO', 'DEMORADO', 'CONGESTIONADO', 'CORTADO']

export function worstStatus(segments) {
  let worst = -1
  for (const segment of segments) {
    worst = Math.max(worst, SEVERITY.indexOf(segment.status))
  }
  return worst < 0 ? 'SIN_DATOS' : SEVERITY[worst]
}
