// Orden fijo, para que la grilla no salte de lugar entre renders.
export const MODE_ORDER = ['TREN', 'SUBTE', 'PREMETRO', 'COLECTIVO', 'AEROPUERTO']

// INTERRUPCION pesa mas que DEMORA, que pesa mas que OBRA/DESVIO.
const SEVERITY = { INTERRUPCION: 3, DEMORA: 2, DESVIO: 1, OBRA: 1 }

/**
 * A partir de la lista de lineas y de alertas activas, arma un mapa
 * mode -> { lineCount, alertCount, worstType }. "worstType" es el
 * tipo de alerta mas grave presente en ese modo, usado para pintar
 * el status pill.
 */
export function summarizeByMode(lines, alerts) {
  const lineModeById = new Map(lines.map((line) => [line.id, line.mode]))
  const summary = new Map()

  for (const line of lines) {
    if (!summary.has(line.mode)) {
      summary.set(line.mode, { lineCount: 0, alertCount: 0, worstType: null })
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

  return summary
}

export function statusFor(worstType) {
  if (worstType === 'INTERRUPCION') return { label: 'Interrupciones', className: 'status-interrupted' }
  if (worstType === 'DEMORA') return { label: 'Demoras', className: 'status-delayed' }
  if (worstType) return { label: 'Alertas activas', className: 'status-delayed' }
  return { label: 'Normal', className: 'status-normal' }
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
