/**
 * Estados de transito que devuelve /api/v1/accesos (ver AccessService
 * en el backend) con su texto y color.
 */
export const TRAFFIC_STATUS = {
  FLUIDO: { label: 'Fluido', color: '#2f8a3c' },
  DEMORADO: { label: 'Demorado', color: '#d08a0a' },
  CONGESTIONADO: { label: 'Congestionado', color: '#c23b34' },
  // Variable CSS: negro en el tema claro, casi blanco en el oscuro.
  CORTADO: { label: 'Cortado', color: 'var(--traffic-closed)' },
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

/** Largo en km de un tramo dibujado ([[lat, lon], ...]). */
export function lengthKm(geometry) {
  let km = 0
  for (let i = 1; i < (geometry?.length ?? 0); i++) {
    const [lat1, lon1] = geometry[i - 1]
    const [lat2, lon2] = geometry[i]
    const toRad = (deg) => (deg * Math.PI) / 180
    const h =
      Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2
    km += 2 * 6371 * Math.asin(Math.sqrt(h))
  }
  return km
}

/**
 * Minutos de mas que se tarda en el tramo medido por ir mas lento que lo
 * normal (redondeado), o null si no hay como calcularlo o es menos de 1.
 */
export function delayMinutes(segment) {
  const { currentSpeed, freeFlowSpeed, geometry } = segment
  const km = lengthKm(geometry)
  if (!(km > 0) || !(currentSpeed > 0) || !(freeFlowSpeed > 0) || currentSpeed >= freeFlowSpeed) return null
  const minutes = Math.round((km / currentSpeed - km / freeFlowSpeed) * 60)
  return minutes >= 1 ? minutes : null
}

/** "104 km/h, velocidad normal" o "58 km/h · normal 92 km/h". */
export function speedText({ currentSpeed, freeFlowSpeed }) {
  if (currentSpeed == null) return 'Sin medición en este momento.'
  if (freeFlowSpeed == null) return `${currentSpeed} km/h`
  if (currentSpeed >= freeFlowSpeed * 0.95) return `${currentSpeed} km/h, velocidad normal`
  return `${currentSpeed} km/h · normal ${freeFlowSpeed} km/h`
}

const PROBLEMS = ['DEMORADO', 'CONGESTIONADO', 'CORTADO']

/**
 * Los tramos con problemas (demorado, congestionado o cortado), de peor a
 * mejor: con las dos manos medidas, cada mano por separado. Para el
 * resumen de arriba de la pagina.
 */
export function trafficProblems(accesses) {
  const list = []
  for (const access of accesses ?? []) {
    for (const segment of access.segments ?? []) {
      const parts = segment.directions?.length ? segment.directions : [segment]
      for (const part of parts) {
        if (!PROBLEMS.includes(part.status)) continue
        list.push({
          access,
          segment: segment.name,
          towards: part.towards ?? null,
          status: part.status,
          currentSpeed: part.currentSpeed,
          freeFlowSpeed: part.freeFlowSpeed,
          delay: delayMinutes(part),
        })
      }
    }
  }
  return list.sort((a, b) => SEVERITY.indexOf(b.status) - SEVERITY.indexOf(a.status))
}

/**
 * El titulo del resumen: "Hay cortes en 1 acceso y demoras en 2 más" o
 * "Hay demoras en 3 accesos". Cuenta accesos (no tramos): los cortes solo
 * los que tienen alguna mano cortada; las demoras, el resto con problemas.
 * null si no hay problemas.
 */
export function problemsTitle(problems) {
  if (!problems?.length) return null
  const accessesWith = (list) => new Set(list.map((p) => p.access.id)).size
  const all = accessesWith(problems)
  const cut = accessesWith(problems.filter((p) => p.status === 'CORTADO'))
  const count = (n) => (n === 1 ? '1 acceso' : `${n} accesos`)
  if (cut === 0) return `Hay demoras en ${count(all)}`
  const slow = all - cut
  return `Hay cortes en ${count(cut)}${slow > 0 ? ` y demoras en ${slow} más` : ''}`
}
