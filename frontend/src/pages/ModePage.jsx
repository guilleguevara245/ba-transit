import Skeleton from '../components/Skeleton.jsx'
import { Link, useParams } from 'react-router-dom'
import ModeIcon from '../components/ModeIcon.jsx'
import TrainNoticesLink from '../components/TrainNoticesLink.jsx'
import BackButton from '../components/BackButton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import LineBadge from '../components/LineBadge.jsx'
import NetworkMap from '../components/NetworkMap.jsx'
import { useApi } from '../hooks/useApi.js'
import { MODE_LABELS_PLURAL, modeFromSlug } from '../constants.js'
import { statusFor, worstAlertType } from '../utils/network.js'
import './ModePage.css'
import { linePath } from '../utils/lineSlug.js'

/**
 * Pagina de un modo (/red/trenes): todas sus lineas con su estado y,
 * si hay coordenadas cargadas, el mapa de sus estaciones.
 */
export default function ModePage() {
  const { slug } = useParams()
  const mode = modeFromSlug(slug)

  const linesState = useApi(`/api/v1/lines?mode=${mode ?? ''}`)
  const alertsState = useApi('/api/v1/alerts', { refreshMs: 60_000 })
  const stationsState = useApi(`/api/v1/map/stations?mode=${mode ?? ''}`)

  if (!mode) {
    return (
      <div className="wrap content">
        <BackButton />
        <div className="loading-text">No existe ese modo de transporte.</div>
      </div>
    )
  }

  const lines = linesState.data ?? []
  const alerts = alertsState.data ?? []
  const stations = stationsState.data ?? []

  return (
    <div className="wrap content">
      <BackButton />

      <h1 className="page-title page-title-icon">
        <ModeIcon mode={mode} size="lg" />
        {MODE_LABELS_PLURAL[mode]}
      </h1>
      {linesState.data && (
        <p className="page-subtitle">
          {lines.length} {lines.length === 1 ? 'línea' : 'líneas'}
        </p>
      )}

      {mode === 'TREN' && <TrainNoticesLink />}

      {linesState.loading && <Skeleton variant="cards" count={6} label="Cargando líneas…" />}
      {linesState.error && <ErrorMessage what="las líneas" error={linesState.error} />}

      <div className="mode-lines">
        {lines.map((line) => {
          const lineAlerts = alerts.filter((a) => a.transportLineId === line.id)
          const status = statusFor(worstAlertType(lineAlerts))
          return (
            <Link key={line.id} to={linePath(line)} className="mode-line-card" style={{ '--line-color': line.colorHex }}>
              <LineBadge line={line} size="md" />
              <span className="mode-line-name">{line.name}</span>
              <span className={`status-pill ${status.className}`}>
                <span className="dot"></span>
                {lineAlerts.length > 1 ? `${status.label} (${lineAlerts.length})` : status.label}
              </span>
              <FavoriteButton lineId={line.id} lineName={line.name} compact />
            </Link>
          )
        })}
      </div>

      {stations.length > 0 && (
        <>
          <div className="section-label">Mapa de {MODE_LABELS_PLURAL[mode].toLowerCase()}</div>
          <NetworkMap className="mode-map" stations={stations} alerts={alerts} />
        </>
      )}
    </div>
  )
}

