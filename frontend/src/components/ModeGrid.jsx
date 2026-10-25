import './ModeGrid.css'
import { MODE_LABELS } from '../constants.js'
import { MODE_ORDER, statusFor, summarizeByMode } from '../utils/network.js'

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
