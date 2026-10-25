import { Link } from 'react-router-dom'
import './ModeGrid.css'
import { MODE_LABELS_PLURAL, MODE_SLUGS } from '../constants.js'
import { MODE_ORDER, statusFor, summarizeByMode } from '../utils/network.js'

export default function ModeGrid({ lines, alerts }) {
  const summary = summarizeByMode(lines, alerts)

  return (
    <div className="modes">
      {MODE_ORDER.filter((mode) => summary.has(mode)).map((mode) => {
        const { lineCount, alertCount, worstType } = summary.get(mode)
        const status = statusFor(worstType)

        return (
          <Link className="mode-card" key={mode} to={`/modos/${MODE_SLUGS[mode]}`}>
            <div className="mode-name">
              {MODE_LABELS_PLURAL[mode] ?? mode}
              <span className="mode-arrow" aria-hidden="true">→</span>
            </div>
            <span className={`status-pill ${status.className}`}>
              <span className="dot"></span>
              {status.label}
            </span>
            <div className="mode-alerts">
              {lineCount} {lineCount === 1 ? 'línea' : 'líneas'} · {alertCount}{' '}
              {alertCount === 1 ? 'alerta activa' : 'alertas activas'}
            </div>
          </Link>
        )
      })}

      {/* Accesos a secciones que no son modos con lineas propias. */}
      <Link className="mode-card" to="/aeropuertos">
        <div className="mode-name">
          Aeropuertos
          <span className="mode-arrow" aria-hidden="true">→</span>
        </div>
        <span className="mode-extra">Aeroparque · Ezeiza</span>
        <div className="mode-alerts">Clima y cómo llegar</div>
      </Link>
    </div>
  )
}
