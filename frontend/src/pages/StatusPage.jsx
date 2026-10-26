import BackButton from '../components/BackButton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useApi } from '../hooks/useApi.js'
import { useNow } from '../hooks/useNow.js'
import { formatRelativeTime } from '../utils/format.js'
import { errorLabel, lastAttemptFailed, statusSummary, STATUS_LABELS } from '../utils/status.js'
import '../components/Panels.css'
import './StatusPage.css'

const REFRESH_MS = 60_000

/**
 * Estado de los datos: como respondio cada fuente la ultima vez que el
 * servidor la consulto. Sirve para saber si un dato esta fresco y para
 * detectar cuando una fuente se cae.
 */
export default function StatusPage() {
  const { data, loading, error } = useApi('/api/v1/estado', { refreshMs: REFRESH_MS })
  const now = useNow(30_000)
  const summary = data ? statusSummary(data.sources) : null

  return (
    <div className="wrap content">
      <BackButton />
      <h1 className="page-title">Estado de los datos</h1>
      <p className="page-subtitle">
        Cómo respondió cada fuente la última vez que el servidor la consultó. Si una falla, el sitio sigue mostrando
        los últimos datos que tenga.
      </p>

      {loading && <Skeleton variant="block" label="Consultando el estado…" />}
      {error && !data && <ErrorMessage what="el estado de los datos" error={error} />}

      {data && (
        <>
          <div className={`status-summary status-${summary.tone}`} role="status">
            <span className="status-summary-dot" aria-hidden="true" />
            {summary.text}
          </div>

          <section className="panel status-panel" aria-label="Fuentes de datos">
            <ul className="status-list">
              {data.sources.map((s) => {
                const label = STATUS_LABELS[s.status]
                return (
                  <li key={s.key} className={`status-item status-item-${label.tone}`}>
                    <span className="status-item-dot" aria-hidden="true" />
                    <div className="status-item-main">
                      <div className="status-item-what">{s.what}</div>
                      <div className="status-item-provider">{s.provider}</div>
                    </div>
                    <div className="status-item-detail">
                      <strong>{label.text}</strong>
                      {s.status === 'OK' && s.lastSuccess && <span>Respondió {formatRelativeTime(s.lastSuccess, now)}</span>}
                      {lastAttemptFailed(s) && (
                        <span className="status-item-retry">
                          Un intento falló {formatRelativeTime(s.lastFailure, now)}
                          {s.lastError && ` (${errorLabel(s.lastError)})`}; se reintenta solo
                        </span>
                      )}
                      {s.status === 'ERROR' && (
                        <span>
                          Falló {formatRelativeTime(s.lastFailure, now)}
                          {s.lastError && ` (${errorLabel(s.lastError)})`}
                          {s.lastSuccess && ` · último dato bueno ${formatRelativeTime(s.lastSuccess, now)}`}
                        </span>
                      )}
                      {s.status === 'SIN_DATOS' && <span>Todavía no se consultó desde que arrancó el servidor</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <p className="airports-source">
            Servidor activo desde {formatRelativeTime(data.startedAt, now)}. Algunas fuentes se consultan solo cuando
            alguien abre la sección que las usa (por ejemplo, los próximos trenes del Belgrano Norte).
          </p>
        </>
      )}
    </div>
  )
}
