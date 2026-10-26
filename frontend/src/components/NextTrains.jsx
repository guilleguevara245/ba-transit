import { useApi } from '../hooks/useApi.js'
import { formatArrival, hasLiveArrivals, nextTrainsPath, scheduleLabel, schedulePath } from '../utils/nextTrains.js'

const REFRESH_MS = 30_000
const SCHEDULE_REFRESH_MS = 60_000

/**
 * Proximos trenes de una estacion. En vivo: subte (pronostico de la API
 * Transporte) o Belgrano Norte (Ferrovias). Si el subte o el premetro no
 * tienen datos en vivo, se muestran las pasadas segun el horario
 * programado (GTFS), aclarado como tal. Sin ninguno de los dos, no muestra
 * nada (tampoco la tarjeta: con asCard el contenedor lo pone este
 * componente, asi no queda un cuadro vacio en la pagina de la estacion).
 */
export default function NextTrains({ mode = 'SUBTE', lineCode, stationName, asCard = false }) {
  const livePath = nextTrainsPath(mode, lineCode, stationName)
  const live = useApi(livePath, { refreshMs: REFRESH_MS })
  const liveUsable = hasLiveArrivals(live.data)
  // El horario se pide solo si el vivo ya respondio sin trenes (o no existe para la linea).
  const wantsSchedule = !liveUsable && !live.loading
  const schedule = useApi(wantsSchedule ? schedulePath(mode, lineCode, stationName) : null, {
    refreshMs: SCHEDULE_REFRESH_MS,
  })

  let content = null
  if (liveUsable) {
    content = <LiveTrains data={live.data} />
  } else if (schedule.data?.available && schedule.data.directions.length > 0) {
    content = <ScheduledTrains directions={schedule.data.directions} />
  } else if (live.data?.available) {
    content = (
      <div className="station-popup-section next-trains">
        <div className="station-popup-label">
          Próximos trenes <span className="live-dot" aria-hidden="true" />
        </div>
        <div className="next-trains-empty">Sin trenes informados en este momento.</div>
      </div>
    )
  }
  if (!content) return null
  return asCard ? <section className="station-card">{content}</section> : content
}

function LiveTrains({ data }) {
  return (
    <div className="station-popup-section next-trains">
      <div className="station-popup-label">
        Próximos trenes <span className="live-dot" aria-hidden="true" />
      </div>
      <ul className="next-trains-list">
        {data.directions.map((d) => (
          <li key={d.directionId}>
            <span className="next-trains-towards">Hacia {d.towards}</span>
            <span className="next-trains-times">
              {d.arrivals.map((a, i) => (
                <span key={i}>
                  {i > 0 && ' · '}
                  {formatArrival(a)}
                  {a.destination && a.destination !== d.towards && (
                    <span className="next-trains-dest"> (a {a.destination})</span>
                  )}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      {data.directions.some((d) => d.arrivals.some((a) => a.estimated)) && (
        <div className="next-trains-note">~ estimado</div>
      )}
      {data.source && <div className="next-trains-note">Fuente: {data.source}</div>}
    </div>
  )
}

function ScheduledTrains({ directions }) {
  return (
    <div className="station-popup-section next-trains">
      <div className="station-popup-label">
        Próximos trenes <span className="next-trains-tag">según horario</span>
      </div>
      <ul className="next-trains-list">
        {directions.map((d) => (
          <li key={d.towards}>
            <span className="next-trains-towards">
              Hacia {d.towards}
              {d.headwayMinutes != null && <span className="next-trains-every">cada {d.headwayMinutes} min</span>}
            </span>
            <span className="next-trains-times">{scheduleLabel(d)}</span>
          </li>
        ))}
      </ul>
      <div className="next-trains-note">Sin datos en vivo: horario programado, puede variar.</div>
    </div>
  )
}
