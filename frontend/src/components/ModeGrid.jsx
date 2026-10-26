import { Link } from 'react-router-dom'
import Chevrons from './Chevrons.jsx'
import ModeIcon from './ModeIcon.jsx'
import './ModeGrid.css'
import { MODE_LABELS_PLURAL, MODE_SLUGS } from '../constants.js'
import { MODE_ORDER, statusFor, summarizeByMode } from '../utils/network.js'
import { useApi } from '../hooks/useApi.js'
import { worstStatus } from '../utils/traffic.js'
import { eventsOnAccesses } from '../utils/events.js'

// Estado de la red de accesos, con las mismas etiquetas que los modos.
const ACCESS_PILL = {
  FLUIDO: { className: 'status-normal', label: 'Fluido' },
  DEMORADO: { className: 'status-delayed', label: 'Demoras' },
  CONGESTIONADO: { className: 'status-interrupted', label: 'Congestionado' },
  CORTADO: { className: 'status-interrupted', label: 'Cortes' },
}

/** Tarjeta de Accesos: el peor estado entre todas las autopistas medidas. */
function AccessesCard() {
  const { data } = useApi('/api/v1/accesos', { refreshMs: 5 * 60_000 })
  const events = useApi('/api/v1/eventos', { refreshMs: 10 * 60_000 })
  const accesses = data?.accesses ?? []
  const pill = data?.configured ? ACCESS_PILL[worstStatus(accesses.flatMap((a) => a.segments))] : null
  const closures = eventsOnAccesses(events.data?.events, accesses).length
  const withDelays = accesses.filter((a) => ['DEMORADO', 'CONGESTIONADO', 'CORTADO'].includes(worstStatus(a.segments))).length

  return (
    <Link className="mode-card chevrons-host" to="/accesos">
      <div className="mode-name">
        <ModeIcon mode="ACCESOS" />
        <span className="mode-label">Accesos</span>
        <Chevrons className="mode-arrow" />
      </div>
      {pill ? (
        <span className={`status-pill ${pill.className}`}>
          <span className="dot"></span>
          {pill.label}
        </span>
      ) : (
        <span className="mode-extra">Autopistas</span>
      )}
      <div className="mode-alerts">
        {pill
          ? `${accesses.length} autopistas · ${withDelays} con demoras`
          : 'Tránsito en las autopistas de acceso'}
        {closures > 0 && ` · ${closures} ${closures === 1 ? 'corte' : 'cortes'}`}
      </div>
    </Link>
  )
}

export default function ModeGrid({ lines, alerts }) {
  const summary = summarizeByMode(lines, alerts)

  return (
    <div className="modes">
      {MODE_ORDER.filter((mode) => summary.has(mode)).map((mode) => {
        const { lineCount, alertCount, worstType } = summary.get(mode)
        const status = statusFor(worstType)

        return (
          <Link className="mode-card chevrons-host" key={mode} to={`/modos/${MODE_SLUGS[mode]}`}>
            <div className="mode-name">
              <ModeIcon mode={mode} />
              <span className="mode-label">{MODE_LABELS_PLURAL[mode] ?? mode}</span>
              <Chevrons className="mode-arrow" />
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

      <AccessesCard />
    </div>
  )
}
