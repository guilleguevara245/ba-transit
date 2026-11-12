// Orden fijo, para que la grilla no salte de lugar entre renders.
export const MODE_ORDER = ['TREN', 'SUBTE', 'PREMETRO', 'COLECTIVO', 'AEROPUERTO']

// INTERRUPCION pesa mas que DEMORA, que pesa mas que OBRA/DESVIO.
const SEVERITY = { INTERRUPCION: 3, DEMORA: 2, DESVIO: 1, OBRA: 1 }

/**
 * A partir de la lista de lineas y de alertas activas, arma un mapa
 * mode -> { lineCount, alertCount, worstType, groups }. "worstType" es el
 * tipo de alerta mas grave presente en ese modo; "groups", las lineas con
 * alertas agrupadas por su peor alerta ([{ type, lineIds }], del estado
 * mas grave al mas leve).
 */
export function summarizeByMode(lines, alerts) {
  const lineModeById = new Map(lines.map((line) => [line.id, line.mode]))
  const summary = new Map()

  for (const line of lines) {
    if (!summary.has(line.mode)) {
      summary.set(line.mode, { lineCount: 0, alertCount: 0, worstType: null, groups: [] })
    }
    summary.get(line.mode).lineCount += 1
  }

  for (const alert of alerts) {
    const mode = lineModeById.get(alert.transportLineId)
    if (!mode || !summary.has(mode)) continue

    const entry = summary.get(mode)
    entry.alertCount += 1

    const currentSeverity = entry.worstType ? SEVERITY[entry.worstType] : 0
    if ((SEVERITY[alert.type] ?? 0) > currentSeverity) {
      entry.worstType = alert.type
    }
  }

  // Cada linea con alertas, en el grupo de su peor alerta ("Interrupciones: Roca"), del
  // estado mas grave al mas leve y en el orden de las lineas. Las que andan bien no van.
  for (const line of lines) {
    const type = worstAlertType(alerts.filter((a) => a.transportLineId === line.id))
    if (!type) continue
    const entry = summary.get(line.mode)
    let group = entry.groups.find((g) => g.type === type)
    if (!group) {
      group = { type, lineIds: [] }
      entry.groups.push(group)
    }
    group.lineIds.push(line.id)
  }
  for (const entry of summary.values()) {
    entry.groups.sort((a, b) => (SEVERITY[b.type] ?? 0) - (SEVERITY[a.type] ?? 0) || GROUP_ORDER.indexOf(a.type) - GROUP_ORDER.indexOf(b.type))
  }

  return summary
}

/** A igual gravedad, las obras antes que los desvios. */
const GROUP_ORDER = ['INTERRUPCION', 'DEMORA', 'OBRA', 'DESVIO']

/** Como se nombra cada grupo en "Estado de la red", y su color. */
export const GROUP_LABELS = {
  INTERRUPCION: { label: 'Interrupciones', tone: 'interrupted' },
  DEMORA: { label: 'Demoras', tone: 'delayed' },
  OBRA: { label: 'Obras', tone: 'delayed' },
  DESVIO: { label: 'Desvíos', tone: 'delayed' },
}

/**
 * El estado de una linea segun su peor alerta, con los mismos nombres que
 * "Estado de la red" (Interrupciones, Demoras, Obras, Desvíos). Un tipo que
 * no se conoce queda como "Alertas activas".
 */
export function statusFor(worstType) {
  if (!worstType) return { label: 'Normal', className: 'status-normal' }
  const group = GROUP_LABELS[worstType]
  if (!group) return { label: 'Alertas activas', className: 'status-delayed' }
  return { label: group.label, className: `status-${group.tone}` }
}

/** Tipo de alerta mas grave de una linea (o null si no tiene alertas). */
export function worstAlertType(alerts) {
  let worst = null
  for (const alert of alerts) {
    if ((SEVERITY[alert.type] ?? 0) > (worst ? SEVERITY[worst] : 0)) {
      worst = alert.type
    }
  }
  return worst
}
