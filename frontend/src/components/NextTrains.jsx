import { Fragment } from 'react'
import { useApi } from '../hooks/useApi.js'
import Chevrons from './Chevrons.jsx'
import { useNow } from '../hooks/useNow.js'
import { urquizaNextTrains } from '../utils/urquizaSchedule.js'
import { STALE_TEXT } from '../utils/staleness.js'
import { readableTextColor } from '../utils/color.js'
import {
  arrivalExtras,
  serviceKind,
  hasLiveArrivals,
  nextTrainsPath,
  scheduleLabel,
  schedulePath,
  serverArrivalText,
  sharedPlatform,
} from '../utils/nextTrains.js'
import './NextTrains.css'

const REFRESH_MS = 30_000
const SCHEDULE_REFRESH_MS = 60_000

/**
 * Proximos trenes de una estacion. Del servidor: subte (pronostico de la
 * API Transporte), Belgrano Norte (Ferrovias) y las lineas de Trenes
 * Argentinos (en vivo o con el horario programado, segun lo que informe
 * la fuente: "scheduled"). Si el subte o el premetro no
 * tienen datos en vivo, se muestran las pasadas segun el horario
 * programado (GTFS), aclarado como tal. Sin ninguno de los dos, no muestra
 * nada (tampoco la tarjeta: con asCard el contenedor lo pone este
 * componente, asi no queda un cuadro vacio en la pagina de la estacion).
 */
export default function NextTrains({ mode = 'SUBTE', lineCode, stationName, asCard = false, compact = false, color }) {
  if (mode === 'TREN' && lineCode === 'URQUIZA') {
    return <UrquizaTrains stationName={stationName} asCard={asCard} compact={compact} color={color} />
  }
  return <ApiTrains mode={mode} lineCode={lineCode} stationName={stationName} asCard={asCard} compact={compact} color={color} />
}

/**
 * Version chica, para las tarjetas del inicio (Mis lineas y Mis
 * estaciones): un renglon por sentido con los tres proximos (si no entran,
 * los horarios bajan al renglon de abajo, sin cortar ninguno).
 */
function CompactTrains({ directions, scheduled = false, live = false, plainTimes = false, color }) {
  // Los chevrones van del color de la linea.
  return (
    <div className="mini-trains-box" style={color ? { '--line-color': color } : undefined}>
      <ul className="mini-trains">
        {directions.map((d, i) => (
          <li key={d.directionId ?? d.towards}>
            <span className="mini-trains-towards">
              {/* Ida y vuelta: el primer sentido (hacia la cabecera inicial) apunta a la izquierda. */}
              <Chevrons className="mini-trains-chevrons" direction={i === 0 && directions.length > 1 ? 'left' : 'right'} />
              {d.towards}
            </span>
            <strong>
              {scheduled
                ? (d.label ?? scheduleLabel(d))
                : d.arrivals
                    .filter((a) => !a.cancelled)
                    .slice(0, 3)
                    .map((a, j) => (
                      <Fragment key={j}>
                        {j > 0 && ' · '}
                        <span className="mini-trains-time">
                          {/* Los rapidos, con el rayo de la linea (sin la palabra: no entra). */}
                          <ServiceIcon name={a.service} label={a.service} />
                          {serverArrivalText(a, plainTimes)}
                        </span>
                      </Fragment>
                    ))}
            </strong>
          </li>
        ))}
      </ul>
      <span className="mini-trains-tag">
        {live ? (
          <>
            En vivo <span className="live-dot" aria-hidden="true" />
          </>
        ) : (
          'Según horario'
        )}
      </span>
    </div>
  )
}

/** Urquiza: sin datos en vivo, se calcula con el horario de Metrovias que trae el sitio. */
function UrquizaTrains({ stationName, asCard, compact, color }) {
  const now = useNow(30_000)
  const schedule = urquizaNextTrains(stationName, now)
  if (!schedule?.available) return null
  if (compact) return <CompactTrains directions={schedule.directions} scheduled color={color} />
  const content = (
    <ScheduledTrains directions={schedule.directions} source={schedule.source} stale={schedule.stale} color={color} />
  )
  return asCard ? <section className="station-card">{content}</section> : content
}

function ApiTrains({ mode, lineCode, stationName, asCard, compact, color }) {
  const livePath = nextTrainsPath(mode, lineCode, stationName)
  const live = useApi(livePath, { refreshMs: REFRESH_MS })
  const liveUsable = hasLiveArrivals(live.data)
  // El horario se pide solo si el vivo ya respondio sin trenes (o no existe para la linea).
  const wantsSchedule = !liveUsable && !live.loading
  const schedule = useApi(wantsSchedule ? schedulePath(mode, lineCode, stationName) : null, {
    refreshMs: SCHEDULE_REFRESH_MS,
  })

  if (compact) {
    if (liveUsable) {
      return (
        <CompactTrains
          directions={live.data.directions.filter((d) => d.arrivals.length > 0)}
          live={!live.data.scheduled}
          plainTimes={Boolean(live.data.scheduled)}
          color={color}
        />
      )
    }
    if (schedule.data?.available && schedule.data.directions.length > 0) {
      return <CompactTrains directions={schedule.data.directions} scheduled color={color} />
    }
    if (live.loading || schedule.loading) return <div className="mini-trains-empty">Buscando trenes…</div>
    if (live.data?.available) return <div className="mini-trains-empty">Sin trenes informados ahora.</div>
    return null
  }

  let content = null
  if (liveUsable) {
    content = <LiveTrains data={live.data} color={color} />
  } else if (schedule.data?.available && schedule.data.directions.length > 0) {
    content = <ScheduledTrains directions={schedule.data.directions} color={color} />
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

/**
 * "Hacia ..." con los chevrones del color de la linea, como en Tus
 * favoritos: el primer sentido (hacia la cabecera inicial) apunta a la
 * izquierda.
 */
function Towards({ index, count, children }) {
  return (
    <span className="next-trains-towards">
      <Chevrons className="next-trains-chevrons" direction={index === 0 && count > 1 ? 'left' : 'right'} />
      {children}
    </span>
  )
}

function LiveTrains({ data, color }) {
  const scheduled = Boolean(data.scheduled)
  // Leyendas de los trenes ("No se detiene en..."): una vez cada una, con el tren al que corresponde.
  const notes = []
  for (const d of data.directions) {
    for (const a of d.arrivals) {
      if (a.note && !a.cancelled && !notes.some((n) => n.text === a.note)) {
        notes.push({ text: a.note, when: serverArrivalText(a, scheduled) })
      }
    }
  }
  return (
    <div className="station-popup-section next-trains">
      <div className="station-popup-label">
        Próximos trenes{' '}
        {scheduled ? <ScheduleTag color={color} /> : <span className="live-dot" aria-hidden="true" />}
      </div>
      <ul className="next-trains-list" style={color ? { '--line-color': color } : undefined}>
        {data.directions.map((d, i) => {
          // Si todos salen del mismo anden, va una vez junto al sentido.
          const platform = sharedPlatform(d.arrivals)
          return (
            <li key={d.directionId}>
              <Towards index={i} count={data.directions.length}>
                Hacia {d.towards}
                {platform && (
                  <>
                    {' · '}
                    <Platform number={platform} />
                  </>
                )}
              </Towards>
              <span className="next-trains-times">
                {d.arrivals.map((a, i) => {
                  const { destination, platform: own } = arrivalExtras(a, d.towards, platform)
                  return (
                    <Fragment key={i}>
                      {/* El separador afuera: los horarios bajan de renglon entre uno y otro, no por la mitad. */}
                      {i > 0 && ' · '}
                      <span className={a.cancelled ? 'next-trains-cancelled' : undefined}>
                        {a.cancelled ? <s>{serverArrivalText(a, scheduled)}</s> : serverArrivalText(a, scheduled)}
                        {a.cancelled ? (
                          <CancelledTag />
                        ) : (
                          a.service && (
                            <span className="next-trains-service">
                              <ServiceIcon name={a.service} />
                              {a.service}
                            </span>
                          )
                        )}
                        {(destination || own) && (
                          <span className="next-trains-dest">
                            {' ('}
                            {destination && `a ${destination}`}
                            {destination && own && ', '}
                            {own && <Platform number={own} />})
                          </span>
                        )}
                      </span>
                    </Fragment>
                  )
                })}
              </span>
            </li>
          )
        })}
      </ul>
      {notes.map((n) => (
        <div key={n.text} className="next-trains-note next-trains-legend">
          {n.when}: {n.text}
        </div>
      ))}
      {scheduled ? (
        <div className="next-trains-note">Horario programado: puede variar.</div>
      ) : (
        data.directions.some((d) => d.arrivals.some((a) => a.estimated)) && (
          <div className="next-trains-note">~ estimado</div>
        )
      )}
      {data.source && <div className="next-trains-note">Fuente: {data.source}</div>}
    </div>
  )
}

/**
 * Icono de cada tipo de servicio, del color de la linea: rapido (y
 * expreso) con el rayo de zigzag doble, semirrapido con el rayo simple y
 * directo con una flecha que va derecho hasta el final. Con label (donde
 * no esta escrito el tipo) se lee en voz alta.
 */
export function ServiceIcon({ name, label }) {
  const kind = serviceKind(name)
  if (!kind) return null
  const icon =
    kind === 'directo' ? (
      <svg className="next-trains-icon next-trains-direct" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path className="stroke" d="M3 12H17M12 7l5 5-5 5M21 5v14" />
      </svg>
    ) : (
      <svg className="next-trains-icon next-trains-bolt" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={kind === 'rapido' ? ZIGZAG_BOLT : BOLT} />
      </svg>
    )
  if (!label) return icon
  return (
    <>
      {icon}
      <span className="visually-hidden">{label}: </span>
    </>
  )
}

/** Rayo simple (semirrapido) y rayo de zigzag doble (rapido). */
const BOLT = 'M8 1H17L13.5 9H19L9 23L11.5 12H6Z'
const ZIGZAG_BOLT = 'M13 1H20L15.5 8H19.5L13.5 14.5H17L6 23L10.5 15.5H7L11 9.5H7.5Z'

/** "andén 2", con el numero en un cartel oscuro, como los de las estaciones. */
export function Platform({ number }) {
  return (
    <span className="next-trains-platform">
      andén <span className="next-trains-platform-sign">{number}</span>
    </span>
  )
}

/** Tren cancelado: la cruz y la palabra, en rojo. */
function CancelledTag() {
  return (
    <span className="next-trains-cancel-tag">
      <svg className="next-trains-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle className="stroke" cx="12" cy="12" r="9" />
        <path className="stroke" d="m8.5 8.5 7 7m0-7-7 7" />
      </svg>
      cancelado
    </span>
  )
}

/** La etiqueta "según horario", del color de la linea. */
function ScheduleTag({ color }) {
  return (
    <span
      className="next-trains-tag"
      style={color ? { background: color, borderColor: color, color: readableTextColor(color) } : undefined}
    >
      según horario
    </span>
  )
}

function ScheduledTrains({ directions, source, stale = false, color }) {
  return (
    <div className="station-popup-section next-trains">
      <div className="station-popup-label">
        Próximos trenes <ScheduleTag color={color} />
      </div>
      <ul className="next-trains-list" style={color ? { '--line-color': color } : undefined}>
        {directions.map((d, i) => (
          <li key={d.towards}>
            <Towards index={i} count={directions.length}>
              Hacia {d.towards}
              {d.headwayMinutes != null && <span className="next-trains-every">cada {d.headwayMinutes} min</span>}
            </Towards>
            <span className="next-trains-times">{d.label ?? scheduleLabel(d)}</span>
          </li>
        ))}
      </ul>
      <div className="next-trains-note">Sin datos en vivo: horario programado, puede variar.</div>
      {source && <div className="next-trains-note">Fuente: {source}</div>}
      {stale && <div className="next-trains-note stale-note">{STALE_TEXT}</div>}
    </div>
  )
}
