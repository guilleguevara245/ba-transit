import { Link } from 'react-router-dom'
import Chevrons from './Chevrons.jsx'
import ModeIcon from './ModeIcon.jsx'
import './ModeGrid.css'
import { MODE_LABELS_PLURAL, MODE_SLUGS } from '../constants.js'
import { GROUP_LABELS, MODE_ORDER, summarizeByMode } from '../utils/network.js'
import { useApi } from '../hooks/useApi.js'
import { accessGroups, worstStatus } from '../utils/traffic.js'
import { eventsOnAccesses } from '../utils/events.js'
import LineBadge from './LineBadge.jsx'
import StatusPill from './StatusPill.jsx'

/** Cuantas lineas de tren se nombran en cada estado; el resto, "y N más". */
const MAX_NAMED = 3

/**
 * Las lineas de un estado: el subte y el Premetro con su insignia, los
 * trenes por nombre ("Belgrano Sur, Roca").
 */
function GroupLines({ lines }) {
  if (lines[0].mode !== 'TREN') {
    return (
      <span className="mode-group-lines">
        {lines.map((line) => (
          <LineBadge key={line.id} line={line} size="sm" />
        ))}
      </span>
    )
  }
  return <span className="mode-group-lines">{namesText(lines.map((l) => l.name.replace(/^Línea\s+/i, '')))}</span>
}

/**
 * Un renglon por estado ("Demoras", "Cortes"...) con lo que lo tiene. Lo
 * que anda bien no se nombra; si todo anda bien, "Normal".
 * rows: [{ key, label, tone, content }].
 */
function StatusRows({ rows }) {
  if (rows.length === 0) return <StatusPill tone="status-normal">Normal</StatusPill>
  return (
    <ul className="mode-groups">
      {rows.map(({ key, label, tone, content }) => (
        <li key={key} className={`mode-group mode-group-${tone}`}>
          <span className="mode-group-dot" aria-hidden="true" />
          <strong>{label}</strong>
          {content}
        </li>
      ))}
    </ul>
  )
}

/** El estado de un modo: Interrupciones, Demoras, Obras o Desvíos, con sus lineas. */
function ModeStatus({ groups, lines }) {
  const rows = groups
    .map((group) => {
      const { label, tone } = GROUP_LABELS[group.type] ?? GROUP_LABELS.DESVIO
      const groupLines = group.lineIds.map((id) => lines.find((l) => l.id === id)).filter(Boolean)
      return { key: group.type, label, tone, content: groupLines.length > 0 && <GroupLines lines={groupLines} /> }
    })
    .filter((row) => row.content)
  return <StatusRows rows={rows} />
}

/** Los nombres de una lista, hasta MAX_NAMED; el resto, "y N más". */
function namesText(names) {
  const shown = names.slice(0, MAX_NAMED)
  const more = names.length - shown.length
  // Espacio que no se corta: "2 más" no queda partido en dos renglones.
  return more > 0 ? `${shown.join(', ')} y ${more}\u00a0más` : shown.join(', ')
}

/** Tarjeta de Accesos: las autopistas con cortes, congestion o demoras. */
function AccessesCard() {
  const { data } = useApi('/api/v1/accesos?resumen=true', { refreshMs: 5 * 60_000 })
  const events = useApi('/api/v1/eventos', { refreshMs: 10 * 60_000 })
  const accesses = data?.accesses ?? []
  // Sin ninguna medicion (todo "sin datos") no se puede decir que este normal.
  const configured = Boolean(data?.configured) && worstStatus(accesses.flatMap((a) => a.segments)) !== 'SIN_DATOS'
  const rows = configured
    ? accessGroups(accesses).map(({ status, label, tone, names }) => ({
        key: status,
        label,
        tone,
        content: <span className="mode-group-lines">{namesText(names)}</span>,
      }))
    : []
  const closures = eventsOnAccesses(events.data?.events, accesses).length
  const withDelays = accesses.filter((a) => ['DEMORADO', 'CONGESTIONADO', 'CORTADO'].includes(worstStatus(a.segments))).length

  return (
    <Link className="mode-card chevrons-host" to="/accesos">
      <div className="mode-name">
        <ModeIcon mode="ACCESOS" />
        <span className="mode-label">Accesos</span>
        <Chevrons className="mode-arrow" />
      </div>
      {configured ? <StatusRows rows={rows} /> : <span className="mode-extra">Autopistas</span>}
      <div className="mode-alerts">
        {configured
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
        const { lineCount, alertCount, groups } = summary.get(mode)

        return (
          <Link className="mode-card chevrons-host" key={mode} to={`/red/${MODE_SLUGS[mode]}`}>
            <div className="mode-name">
              <ModeIcon mode={mode} />
              <span className="mode-label">{MODE_LABELS_PLURAL[mode] ?? mode}</span>
              <Chevrons className="mode-arrow" />
            </div>
            <ModeStatus groups={groups} lines={lines} />
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
