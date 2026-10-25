import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import AlertsPanel from '../components/AlertsPanel.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { useApi } from '../hooks/useApi.js'
import { MODE_LABELS } from '../constants.js'
import '../components/Panels.css'
import './LinePage.css'

// Por ahora solo las estaciones de subte tienen coordenadas en el mapa.
const MODES_ON_MAP = ['SUBTE']

function BranchStations({ branch, line, highlightedId }) {
  const { data: stations, loading, error } = useApi(`/api/v1/branches/${branch.id}/stations`)
  const highlightedRef = useRef(null)

  useEffect(() => {
    highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [stations, highlightedId])

  const showMapLinks = MODES_ON_MAP.includes(line.mode)

  return (
    <div className="panel">
      <div className="panel-title">
        {branch.name}
        {stations && <span className="count">{stations.length} estaciones</span>}
      </div>

      {loading && <div className="loading-text">Cargando estaciones...</div>}
      {error && <ErrorMessage what="las estaciones" error={error} />}

      {stations && (
        <ol className="station-list" style={{ '--line-color': line.colorHex }}>
          {stations.map((station) => {
            const highlighted = station.id === highlightedId
            return (
              <li
                key={station.id}
                ref={highlighted ? highlightedRef : undefined}
                className={highlighted ? 'station-item highlighted' : 'station-item'}
              >
                <span className="station-dot"></span>
                <span className="station-name">{station.name}</span>
                {showMapLinks && station.latitude != null && (
                  <Link className="station-map-link" to={`/mapa?estacion=${station.id}`}>
                    Ver en el mapa
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default function LinePage() {
  const { lineId } = useParams()
  const [searchParams] = useSearchParams()
  const highlightedId = Number(searchParams.get('estacion')) || null

  const lineState = useApi(`/api/v1/lines/${lineId}`)
  const branchesState = useApi(`/api/v1/lines/${lineId}/branches`)
  const alertsState = useApi(`/api/v1/lines/${lineId}/alerts`, { refreshMs: 60_000 })

  const line = lineState.data

  return (
    <div className="wrap content">
      <Link to="/" className="back-link">
        ← Volver al dashboard
      </Link>

      {lineState.loading && <div className="loading-text">Cargando línea...</div>}
      {lineState.error && <ErrorMessage what="la línea" error={lineState.error} />}

      {line && (
        <>
          <div className="line-header">
            <span className="line-badge" style={{ background: line.colorHex }}>
              {line.code}
            </span>
            <div>
              <h1 className="line-title">{line.name}</h1>
              <div className="line-mode">{MODE_LABELS[line.mode] ?? line.mode}</div>
            </div>
          </div>

          {alertsState.data && (
            <div className="line-section">
              <AlertsPanel alerts={alertsState.data} lines={[line]} />
            </div>
          )}

          <div className="section-label">Ramales y estaciones</div>
          {branchesState.error && <ErrorMessage what="los ramales" error={branchesState.error} />}
          {branchesState.data && branchesState.data.length === 0 && (
            <div className="loading-text">Esta línea todavía no tiene estaciones cargadas.</div>
          )}
          <div className="branches">
            {branchesState.data?.map((branch) => (
              <BranchStations key={branch.id} branch={branch} line={line} highlightedId={highlightedId} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
