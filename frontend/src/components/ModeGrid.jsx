import './ModeGrid.css'

const MODE_LABELS = {
  SUBTE: 'Subte',
  TREN: 'Trenes',
  PREMETRO: 'Premetro',
  COLECTIVO: 'Colectivos',
  AEROPUERTO: 'Aeropuertos',
}

// Orden fijo, para que la grilla no salte de lugar entre renders.
const MODE_ORDER = ['TREN', 'SUBTE', 'PREMETRO', 'COLECTIVO', 'AEROPUERTO']

/**
 * A partir de la lista de lineas y de alertas activas, arma un mapa
 * mode -> { lineCount, alertCount, worstType }. "worstType" es el
 * tipo de alerta mas grave presente en ese modo, usado para pintar
 * el status pill (INTERRUPCION pesa mas que DEMORA, que pesa mas que
 * OBRA/DESVIO/nada).
 */
function summarizeByMode(lines, alerts) {
  const lineModeById = new Map(lines.map((line) => [line.id, line.mode]))
  const summary = new Map()

  for (const line of lines) {
    if (!summary.has(line.mode)) {
      summary.set(line.mode, { lineCount: 0, alertCount: 0, worstType: null })
    }
    summary.get(line.mode).lineCount += 1
  }

  const severity = { INTERRUPCION: 3, DEMORA: 2, DESVIO: 1, OBRA: 1 }

  for (const alert of alerts) {
    const mode = lineModeById.get(alert.transportLineId)
    if (!mode || !summary.has(mode)) continue

    const entry = summary.get(mode)
    entry.alertCount += 1

    const currentSeverity = entry.worstType ? severity[entry.worstType] : 0
    if (severity[alert.type] > currentSeverity) {
      entry.worstType = alert.type
    }
  }

  return summary
}

function statusFor(worstType) {
  if (worstType === 'INTERRUPCION') return { label: 'Interrupciones', className: 'status-interrupted' }
  if (worstType === 'DEMORA') return { label: 'Demoras', className: 'status-delayed' }
  if (worstType) return { label: 'Alertas activas', className: 'status-delayed' }
  return { label: 'Normal', className: 'status-normal' }
}

export default function ModeGrid({ lines, alerts }) {
  const summary = summarizeByMode(lines, alerts)

  return (
    <div className="modes">
      {MODE_ORDER.filter((mode) => summary.has(mode)).map((mode) => {
        const { lineCount, alertCount, worstType } = summary.get(mode)
        const status = statusFor(worstType)

        return (
          <div className="mode-card" key={mode}>
            <div className="mode-name">{MODE_LABELS[mode] ?? mode}</div>
            <span className={`status-pill ${status.className}`}>
              <span className="dot"></span>
              {status.label}
            </span>
            <div className="mode-alerts">
              {lineCount} {lineCount === 1 ? 'línea' : 'líneas'} · {alertCount}{' '}
              {alertCount === 1 ? 'alerta activa' : 'alertas activas'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
