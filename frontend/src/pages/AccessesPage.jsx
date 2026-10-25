import Skeleton from '../components/Skeleton.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import AccessesMap from '../components/AccessesMap.jsx'
import BackButton from '../components/BackButton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { useApi } from '../hooks/useApi.js'
import { useNow } from '../hooks/useNow.js'
import { formatRelativeTime } from '../utils/format.js'
import { speedPercent, trafficStatus, worstStatus } from '../utils/traffic.js'
import './ModePage.css'
import './AirportsPage.css'
import './AccessesPage.css'

// El backend guarda la medicion 20 minutos; pedirla cada 5 alcanza
// para mostrar el dato nuevo poco despues de que llegue.
const REFRESH_MS = 5 * 60_000

function StatusPill({ status }) {
  const { label, color } = trafficStatus(status)
  return (
    <span className="traffic-pill" style={{ '--status-color': color }}>
      {label}
    </span>
  )
}

function SegmentRow({ segment, configured }) {
  const percent = speedPercent(segment)
  const { color } = trafficStatus(segment.status)

  return (
    <li className="access-segment">
      <div className="access-segment-head">
        <span className="access-segment-name">{segment.name}</span>
        {configured && <StatusPill status={segment.status} />}
      </div>
      {configured && (
        <>
          <div className="speed-bar" aria-hidden="true">
            <span style={{ width: `${segment.checkLocation ? 0 : (percent ?? 0)}%`, background: color }} />
          </div>
          <div className="access-segment-speed">
            {segment.checkLocation
              ? 'El punto de medición no cae sobre la autopista: hay que revisarlo.'
              : segment.currentSpeed != null
                ? `${segment.currentSpeed} km/h · normal ${segment.freeFlowSpeed} km/h`
                : 'Sin medición en este momento.'}
          </div>
        </>
      )}
    </li>
  )
}

function AccessCard({ access, configured }) {
  const overall = worstStatus(access.segments)
  return (
    <article className="access-card" style={{ '--status-color': trafficStatus(overall).color }}>
      <header className="access-head">
        <span className="road-shield">{access.road}</span>
        <div className="access-title">
          <h2 className="access-name">{access.name}</h2>
          <div className="access-connects">{access.connects}</div>
          {configured && <StatusPill status={overall} />}
        </div>
      </header>
      <ul className="access-segments">
        {access.segments.map((segment) => (
          <SegmentRow key={segment.name} segment={segment} configured={configured} />
        ))}
      </ul>
      <footer className="access-operator">Concesionaria: {access.operator}</footer>
    </article>
  )
}

/**
 * Accesos: estado del transito en las cuatro autopistas principales que
 * entran a la Ciudad, medido con la API de trafico de TomTom.
 */
export default function AccessesPage() {
  const { data, loading, error } = useApi('/api/v1/accesos', { refreshMs: REFRESH_MS })
  const now = useNow()
  const hasGeometry = data?.accesses.some((a) => a.segments.some((s) => s.geometry.length > 1))

  return (
    <div className="wrap content">
      <BackButton />
      <h1 className="page-title page-title-icon">
        <ModeIcon mode="ACCESOS" size="lg" />
        Accesos
      </h1>
      <p className="page-subtitle">
        Estado del tránsito en las autopistas que entran a la Ciudad.
        {data?.updatedAt && ` Medido ${formatRelativeTime(data.updatedAt, now)}.`}
      </p>

      {loading && <Skeleton variant="cards" count={4} label="Cargando accesos…" />}
      {error && !data && <ErrorMessage what="el estado de los accesos" error={error} />}

      {data && !data.configured && (
        <div className="bus-unavailable access-unconfigured">
          El estado en vivo todavía no está configurado (falta la clave de TomTom en el servidor). Mientras
          tanto se muestran los accesos y sus concesionarias.
        </div>
      )}

      {data && (
        <>
          <div className="traffic-legend" aria-label="Referencias">
            {['FLUIDO', 'DEMORADO', 'CONGESTIONADO', 'CORTADO'].map((code) => (
              <span key={code}>
                <i style={{ background: trafficStatus(code).color }} />
                {trafficStatus(code).label}
              </span>
            ))}
          </div>

          <div className="accesses-grid">
            {data.accesses.map((access) => (
              <AccessCard key={access.id} access={access} configured={data.configured} />
            ))}
          </div>

          {hasGeometry && (
            <>
              <div className="section-label">Tramos medidos</div>
              <AccessesMap className="accesses-map" accesses={data.accesses} />
            </>
          )}

          <p className="airports-source">
            Datos de tránsito: TomTom Traffic. Fluido = se circula al 75% o más de la velocidad normal del tramo;
            demorado = entre 45% y 75%; congestionado = menos de 45%. Se actualiza cada 20 minutos.
          </p>
        </>
      )}
    </div>
  )
}
