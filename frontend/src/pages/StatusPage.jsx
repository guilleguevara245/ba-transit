import { useState } from 'react'
import BackButton from '../components/BackButton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useApi } from '../hooks/useApi.js'
import { useNow } from '../hooks/useNow.js'
import { formatRelativeTime } from '../utils/format.js'
import { errorLabel, lastAttemptFailed, statusGroups, statusSummary, STATUS_LABELS } from '../utils/status.js'
import '../components/Panels.css'
import './StatusPage.css'

const REFRESH_MS = 60_000

/** Iconos de estado (trazo, 24x24): funciona, con problemas, sin consultar. */
const STATE_ICONS = {
  ok: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-4 9.5 2.7 2.7L16 9.8',
  error: 'M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0zM12 9.5v4m0 3h.01',
  idle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-4 9h8',
}

function StateIcon({ tone, className = '' }) {
  return (
    <svg className={`state-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={STATE_ICONS[tone]} />
    </svg>
  )
}

/** Lo que dice cada fuente en palabras simples (y, con los detalles, lo tecnico). */
function SourceRow({ source, now, details }) {
  const label = STATUS_LABELS[source.status]
  let plain
  if (source.status === 'OK') {
    plain = source.lastSuccess ? `Actualizado ${formatRelativeTime(source.lastSuccess, now)}` : label.text
  } else if (source.status === 'ERROR') {
    plain = source.lastSuccess
      ? `Con problemas · último dato ${formatRelativeTime(source.lastSuccess, now)}`
      : 'Con problemas'
  } else {
    plain = 'Se consulta cuando alguien usa esa sección'
  }

  return (
    <li className={`status-source status-source-${label.tone}`}>
      <StateIcon tone={label.tone} />
      <div className="status-source-text">
        <span className="status-source-name">{source.name}</span>
        <span className="status-source-plain">{plain}</span>
        {details && (
          <span className="status-source-tech">
            Fuente: {source.provider}
            {source.status === 'ERROR' &&
              source.lastFailure &&
              ` · falló ${formatRelativeTime(source.lastFailure, now)}${source.lastError ? ` (${errorLabel(source.lastError)})` : ''}`}
            {lastAttemptFailed(source) &&
              ` · un intento falló ${formatRelativeTime(source.lastFailure, now)}${source.lastError ? ` (${errorLabel(source.lastError)})` : ''}; se reintenta solo`}
          </span>
        )}
      </div>
    </li>
  )
}

/**
 * Estado de los datos: si lo que muestra el sitio esta llegando bien. Un
 * resumen arriba y una tarjeta por tema (subte, trenes, clima...), con
 * iconos y palabras simples. Los detalles tecnicos (de donde sale cada
 * dato y por que fallo) se ven a pedido.
 */
export default function StatusPage() {
  const { data, loading, error } = useApi('/api/v1/estado', { refreshMs: REFRESH_MS })
  const now = useNow(30_000)
  const [details, setDetails] = useState(false)
  const summary = data ? statusSummary(data.sources) : null
  const groups = data ? statusGroups(data.sources) : []

  return (
    <div className="wrap content">
      <BackButton />
      <h1 className="page-title">Estado de los datos</h1>
      <p className="page-subtitle">Si la información que ves en BA Transit está llegando bien.</p>

      {loading && <Skeleton variant="block" label="Consultando el estado…" />}
      {error && !data && <ErrorMessage what="el estado de los datos" error={error} />}

      {data && (
        <>
          <div className={`status-hero status-hero-${summary.tone}`} role="status">
            <StateIcon tone={summary.tone} className="status-hero-icon" />
            <div>
              <strong>{summary.title}</strong>
              <span>{summary.text}</span>
            </div>
          </div>

          <div className="status-toolbar">
            <ul className="status-legend" aria-label="Referencias">
              {['ok', 'error', 'idle'].map((tone) => (
                <li key={tone} className={`status-legend-${tone}`}>
                  <StateIcon tone={tone} />
                  {{ ok: 'Funciona', error: 'Con problemas', idle: 'Sin consultar todavía' }[tone]}
                </li>
              ))}
            </ul>
            <label className="status-details-toggle">
              <input type="checkbox" checked={details} onChange={(e) => setDetails(e.target.checked)} />
              Ver detalles técnicos
            </label>
          </div>

          <div className="status-grid">
            {groups.map((group) => {
              const tone = STATUS_LABELS[group.status].tone
              return (
                <section key={group.id} className={`status-card status-card-${tone}`} aria-label={group.title}>
                  <header className="status-card-head">
                    <ModeIcon mode={group.icon} />
                    <h2>{group.title}</h2>
                    <span className="status-pill">
                      <StateIcon tone={tone} />
                      {STATUS_LABELS[group.status].text}
                    </span>
                  </header>
                  <ul className="status-sources">
                    {group.sources.map((s) => (
                      <SourceRow key={s.key} source={s} now={now} details={details} />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>

          <p className="airports-source">
            Si algo falla, el sitio sigue mostrando los últimos datos que tenga y vuelve a intentar solo.
            {details && ` Servidor activo desde ${formatRelativeTime(data.startedAt, now)}.`}
          </p>
        </>
      )}
    </div>
  )
}
