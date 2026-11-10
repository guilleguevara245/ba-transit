import { useState } from 'react'
import Skeleton from '../components/Skeleton.jsx'
import Chevrons from '../components/Chevrons.jsx'
import ExternalTitle from '../components/ExternalTitle.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import AccessesMap from '../components/AccessesMap.jsx'
import BackButton from '../components/BackButton.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import UpdatedAt from '../components/UpdatedAt.jsx'
import { useApi } from '../hooks/useApi.js'
import EventCard from '../components/EventCard.jsx'
import { eventsOnAccesses } from '../utils/events.js'
import { PEAK_HOURS, TOLLS, formatToll, peakNow } from '../data/tolls.js'
import { holidayOn } from '../utils/holidays.js'
import { useNow } from '../hooks/useNow.js'
import { useFlash } from '../hooks/useFlash.js'
import { formatLongDate } from '../utils/format.js'
import { problemsTitle, speedPercent, speedText, trafficProblems, trafficStatus, worstStatus } from '../utils/traffic.js'
import './ModePage.css'
import './AirportsPage.css'
import './AccessesPage.css'
import { STALE_TEXT, isStale } from '../utils/staleness.js'

// El backend guarda la medicion 20 minutos; pedirla cada 5 alcanza
// para mostrar el dato nuevo poco despues de que llegue.
const REFRESH_MS = 5 * 60_000

/** El estado del transito; si cambia mientras se mira la pagina, parpadea una vez. */
function StatusPill({ status }) {
  const { label, color } = trafficStatus(status)
  const flash = useFlash(status)
  return (
    <span
      key={flash}
      className={flash ? 'traffic-pill status-flash' : 'traffic-pill'}
      style={{ '--status-color': color }}
    >
      {label}
    </span>
  )
}

/** Una mano del tramo: hacia donde va, su estado y la barra de velocidad. */
function DirectionRow({ direction }) {
  const percent = speedPercent(direction)
  const { label, color } = trafficStatus(direction.status)
  return (
    <div className="access-direction" style={{ '--status-color': color }}>
      <div className="access-direction-head">
        <span className="access-direction-towards chevrons-host">
          <Chevrons /> Hacia {direction.towards}
        </span>
        <span className="access-direction-status">{label}</span>
      </div>
      <div className="speed-bar" aria-hidden="true">
        <span style={{ width: `${percent ?? 0}%`, background: color }} />
      </div>
      <div className="access-segment-speed">{speedText(direction)}</div>
    </div>
  )
}

function SegmentRow({ segment, configured }) {
  const percent = speedPercent(segment)
  const { color } = trafficStatus(segment.status)

  if (configured && segment.directions?.length) {
    return (
      <li className="access-segment">
        <div className="access-segment-head">
          <span className="access-segment-name">{segment.name}</span>
          <StatusPill status={segment.status} />
        </div>
        <div className="access-directions">
          {segment.directions.map((d) => (
            <DirectionRow key={d.towards} direction={d} />
          ))}
        </div>
      </li>
    )
  }

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
              : speedText(segment)}
          </div>
        </>
      )}
    </li>
  )
}

/** "$994 con TelePASE · $2.000 sin TelePASE", o un solo precio si es el mismo. */
function priceNow(plaza, column) {
  const tele = plaza.telepase[column]
  const manual = plaza.manual[column]
  if (formatToll(tele) === formatToll(manual)) {
    return (
      <>
        <strong>{formatToll(tele)}</strong> con o sin TelePASE
      </>
    )
  }
  return (
    <>
      <strong>{formatToll(tele)}</strong> con TelePASE · <strong>{formatToll(manual)}</strong> sin TelePASE
    </>
  )
}

/**
 * Peaje del acceso: a la vista, lo que se paga ahora (pico o no pico) en
 * la primera cabina; el cuadro completo de cada cabina, a pedido.
 */
function TollTable({ toll, accessId }) {
  const now = useNow(60_000)
  const [open, setOpen] = useState(false)
  const { peak, towards } = peakNow(accessId, now, Boolean(holidayOn(now)))
  const rules = PEAK_HOURS[accessId]
  // Columna que rige ahora: 0 no pico, 1 pico.
  const current = peak ? 1 : 0
  const cell = (index) => (index === current ? 'now' : undefined)
  const first = toll.plazas[0]
  const tableId = `peaje-${accessId}`

  return (
    <div className="toll">
      <div className="toll-title">Peaje para autos</div>
      {towards ? (
        // Fin de semana: la hora pico rige en una sola mano; en la otra se paga lo de no pico.
        <p className="toll-summary">
          <span className="toll-summary-line">
            <span className="toll-summary-when">Hacia {towards}, hora pico:</span> {priceNow(first, 1)}
          </span>
          <span className="toll-summary-line">
            <span className="toll-summary-when">
              Hacia {towards === 'CABA' ? 'Provincia' : 'CABA'}, fuera de hora pico:
            </span>{' '}
            {priceNow(first, 0)}
          </span>
        </p>
      ) : (
        <p className="toll-summary">
          <span className="toll-summary-when">Ahora, {peak ? 'hora pico' : 'fuera de hora pico'}:</span>{' '}
          {priceNow(first, current)}
          {toll.plazas.length > 1 && <small>{first.name}</small>}
        </p>
      )}
      <button
        type="button"
        className="toll-toggle chevrons-host"
        aria-expanded={open}
        aria-controls={tableId}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Ocultar las tarifas' : toll.plazas.length > 1 ? 'Ver las tarifas de cada cabina' : 'Ver las tarifas'}{' '}
        <Chevrons className="toll-chevrons" />
      </button>
      {open && (
        <div id={tableId}>
          {toll.plazas.map((plaza) => (
            <table className="toll-table" key={plaza.name}>
              <caption>{plaza.name}</caption>
              <thead>
                <tr>
                  <th scope="col" />
                  <th scope="col" className={cell(0)}>
                    No pico{current === 0 && <span className="toll-now">ahora</span>}
                  </th>
                  <th scope="col" className={cell(1)}>
                    Pico{current === 1 && <span className="toll-now">ahora</span>}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">TelePASE</th>
                  <td className={cell(0)}>{formatToll(plaza.telepase[0])}</td>
                  <td className={cell(1)}>{formatToll(plaza.telepase[1])}</td>
                </tr>
                <tr>
                  <th scope="row">Sin TelePASE</th>
                  <td className={cell(0)}>{formatToll(plaza.manual[0])}</td>
                  <td className={cell(1)}>{formatToll(plaza.manual[1])}</td>
                </tr>
              </tbody>
            </table>
          ))}
          {towards && <div className="toll-direction">Ahora la hora pico rige solo hacia {towards}.</div>}
          {rules && <div className="toll-source toll-note">{rules.text}</div>}
          {toll.note && <div className="toll-source toll-note">{toll.note}</div>}
        </div>
      )}
      <div className="toll-source">
        Vigente desde el {formatLongDate(toll.since)} ·{' '}
        <a href={toll.source} target="_blank" rel="noreferrer">
          <ExternalTitle text="Fuente" />
        </a>
        {isStale('peajes') && <span className="toll-note stale-note">{STALE_TEXT}</span>}
      </div>
    </div>
  )
}

/**
 * Arriba de todo: si los accesos estan fluidos o donde hay problemas,
 * cada uno con un enlace a su tarjeta.
 */
function TrafficSummary({ accesses }) {
  const problems = trafficProblems(accesses)
  const withProblems = new Set(problems.map((p) => p.access.id)).size
  if (problems.length === 0) {
    return (
      <div className="access-summary access-summary-ok" role="status">
        <strong>Todos los accesos están fluidos</strong>
        <span>Se circula a la velocidad normal o cerca en todos los tramos medidos.</span>
      </div>
    )
  }
  const worst = problems[0].status
  const title = problemsTitle(problems)
  return (
    <div className="access-summary" role="status" style={{ '--status-color': trafficStatus(worst).color }}>
      <strong>{title}</strong>
      <span>{withProblems === accesses.length ? 'Ninguno está del todo fluido.' : 'El resto está fluido.'}</span>
      <ul className="access-summary-list">
        {problems.map((p) => (
          <li key={`${p.access.id}-${p.segment}-${p.towards ?? ''}`}>
            <a className="access-summary-row" href={`#acceso-${p.access.id}`}>
              <span className="road-shield road-shield-sm">{p.access.road}</span>
              <span className="access-summary-text">
                <b>{p.access.name}</b>
                <span>
                  {p.segment}
                  {p.towards ? `, hacia ${p.towards}` : ''}
                  {p.currentSpeed != null ? ` · ${p.currentSpeed} km/h` : ''}
                  {p.delay != null ? ` · ≈ ${p.delay} min de demora` : ''}
                </span>
              </span>
              <StatusPill status={p.status} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AccessCard({ access, configured }) {
  const overall = worstStatus(access.segments)
  return (
    <article
      className="access-card"
      id={`acceso-${access.id}`}
      style={{ '--status-color': trafficStatus(overall).color }}
    >
      <header className="access-head">
        <span className="road-shield">{access.road}</span>
        <div className="access-title">
          <h2 className="access-name">{access.name}</h2>
          <div className="access-connects">{access.connects}</div>
          {configured && <StatusPill status={overall} />}
        </div>
        <FavoriteButton kind="accesos" id={access.id} name={access.name} compact />
      </header>
      <ul className="access-segments">
        {access.segments.map((segment) => (
          <SegmentRow key={segment.name} segment={segment} configured={configured} />
        ))}
      </ul>
      {TOLLS[access.id] && <TollTable toll={TOLLS[access.id]} accessId={access.id} />}
      <footer className="access-operator">Concesionaria: {access.operator}</footer>
    </article>
  )
}

/**
 * Accesos: estado del transito en las cuatro autopistas principales que
 * entran a la Ciudad, medido con la API de trafico de TomTom.
 */
export default function AccessesPage() {
  const { data, loading, error, reload, refreshing } = useApi('/api/v1/accesos', { refreshMs: REFRESH_MS })
  const eventsState = useApi('/api/v1/eventos', { refreshMs: REFRESH_MS })
  const closures = data ? eventsOnAccesses(eventsState.data?.events, data.accesses) : []
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
      </p>
      {data && (
        <UpdatedAt
          className="page-updated"
          verb="Medido"
          at={data.updatedAt}
          onRefresh={reload}
          refreshing={refreshing}
        />
      )}

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
          {data.configured && <TrafficSummary accesses={data.accesses} />}

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

          {closures.length > 0 && (
            <>
              <div className="section-label">Cortes y eventos cerca de los accesos</div>
              <div className="events-grid access-closures">
                {closures.map(({ event, access }) => (
                  <EventCard key={event.id} event={event} extra={access ? `Cerca de ${access}` : null} />
                ))}
              </div>
            </>
          )}

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
