import { Fragment, useEffect, useId, useRef, useState } from 'react'
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
function CompactTrains({ directions, scheduled = false, live = false, color }) {
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
              <ClockIcon />
              {scheduled ? (
                <TimesLabel label={d.label ?? scheduleLabel(d)} />
              ) : (
                d.arrivals
                    .filter((a) => !a.cancelled)
                    .slice(0, 3)
                    .map((a, j) => (
                      <Fragment key={j}>
                        {j > 0 && ' · '}
                        <span className="mini-trains-time">
                          {/* Los rapidos, con el rayo de la linea (sin la palabra: no entra). */}
                          <ServiceIcon name={a.service} label={a.service} />
                          <TimeText text={serverArrivalText(a)} />
                        </span>
                      </Fragment>
                    ))
              )}
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
          <ScheduleTag color={color} />
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
  return asCard ? (
    <section className="station-card next-trains-card">
      <SymbolsHelp className="next-trains-help" />
      {content}
    </section>
  ) : (
    content
  )
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
  return asCard ? (
    <section className="station-card next-trains-card">
      <SymbolsHelp className="next-trains-help" />
      {content}
    </section>
  ) : (
    content
  )
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
        notes.push({ text: a.note, when: serverArrivalText(a) })
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
                <ClockIcon />
                {d.arrivals.map((a, i) => {
                  const { destination, platform: own } = arrivalExtras(a, d.towards, platform)
                  return (
                    <Fragment key={i}>
                      {/* El separador afuera: los horarios bajan de renglon entre uno y otro, no por la mitad. */}
                      {i > 0 && ' · '}
                      <span className={a.cancelled ? 'next-trains-cancelled' : undefined}>
                        {a.cancelled ? (
                          <s>{serverArrivalText(a)}</s>
                        ) : (
                          <TimeText text={serverArrivalText(a)} />
                        )}
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
          <div className="next-trains-note">Algunos horarios son estimados: puede variar.</div>
        )
      )}
      {data.source && <div className="next-trains-note">Fuente: {data.source}</div>}
    </div>
  )
}

/**
 * Icono de cada tipo de servicio, del color de la linea: rapido (y
 * expreso) con el rayo de zigzag doble, semirrapido con el rayo simple,
 * directo con una flecha que va derecho hasta el final y especial (tren
 * agregado) con un mas en un circulo. Con label (donde no esta escrito el
 * tipo) se lee en voz alta.
 */
export function ServiceIcon({ name, label }) {
  const kind = serviceKind(name)
  if (!kind) return null
  const icon =
    kind === 'directo' ? (
      <svg className="next-trains-icon next-trains-direct" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path className="stroke" d="M3 12H17M12 7l5 5-5 5M21 5v14" />
      </svg>
    ) : kind === 'especial' ? (
      <svg className="next-trains-icon next-trains-direct" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle className="stroke" cx="12" cy="12" r="9" />
        <path className="stroke" d="M12 7.5v9M7.5 12h9" />
      </svg>
    ) : (
      <svg className="next-trains-icon next-trains-bolt" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={kind === 'rapido' ? ZIGZAG_BOLT : BOLT} />
      </svg>
    )
  if (!label) return icon
  return (
    <span className="has-tip" data-tip={label}>
      {icon}
      <span className="visually-hidden">{label}: </span>
    </span>
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

/** La cruz en un circulo de los trenes cancelados. */
function CancelIcon() {
  return (
    <svg className="next-trains-icon next-trains-cancel-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle className="stroke" cx="12" cy="12" r="9" />
      <path className="stroke" d="m8.5 8.5 7 7m0-7-7 7" />
    </svg>
  )
}

/** Tren cancelado: la cruz y la palabra, en rojo. */
function CancelledTag() {
  return (
    <span className="next-trains-cancel-tag">
      <CancelIcon />
      cancelado
    </span>
  )
}

/** Reloj gris antes de los horarios de cada sentido. */
export function ClockIcon() {
  return (
    <svg className="next-trains-clock" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

/** Los simbolos de los horarios y que quiere decir cada uno (en el orden en que suelen aparecer). */
const SYMBOLS = [
  { icon: <ClockIcon />, text: 'Próximos horarios' },
  { icon: <span className="live-dot" aria-hidden="true" />, text: 'En vivo, con los datos de la empresa' },
  { icon: <ScheduleTag />, text: 'Horario programado, sin datos en vivo' },
  { icon: <ServiceIcon name="Semirrápido" />, text: 'Semirrápido: saltea algunas estaciones' },
  { icon: <ServiceIcon name="Rápido" />, text: 'Rápido o expreso: para en pocas estaciones' },
  { icon: <ServiceIcon name="Directo" />, text: 'Directo: no para hasta el final' },
  { icon: <ServiceIcon name="Especial" />, text: 'Especial: tren agregado, fuera del horario' },
  { icon: <ArrivingIcon />, text: 'Llegando a la estación' },
  { icon: <CancelIcon />, text: 'Cancelado' },
  { icon: <span className="next-trains-platform-sign">2</span>, text: 'Andén' },
]

/**
 * "?" que abre "Que significa cada simbolo": arriba a la derecha de Tus
 * favoritos y de los proximos trenes de una estacion. Se cierra con Escape,
 * tocando afuera o con el mismo boton.
 */
export function SymbolsHelp({ className = '' }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !box.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className={`symbols-help ${className}`.trim()} ref={box}>
      <button
        type="button"
        className="symbols-help-button"
        aria-expanded={open}
        aria-controls={id}
        aria-label="Qué significa cada símbolo"
        title="Qué significa cada símbolo"
        onClick={() => setOpen((o) => !o)}
      >
        ?
      </button>
      {open && (
        <div className="symbols-help-box" id={id} role="dialog" aria-label="Qué significa cada símbolo">
          <div className="symbols-help-title">Qué significa cada símbolo</div>
          <ul className="symbols-list">
            {SYMBOLS.map((s) => (
              <li key={s.text}>
                <span className="symbols-list-icon" aria-hidden="true">
                  {s.icon}
                </span>
                {s.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** El tren de frente de "llegando". */
function ArrivingIcon() {
  return (
    <svg className="next-trains-arriving-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M5 10h14M9 21l1.5-3M15 21l-1.5-3" />
      <circle cx="9" cy="13.5" r="1" />
      <circle cx="15" cy="13.5" r="1" />
    </svg>
  )
}

/** "llegando": un tren de frente y la palabra, del color de la linea. */
function ArrivingTag() {
  return (
    <span className="next-trains-arriving">
      <ArrivingIcon />
      llegando
    </span>
  )
}

/** Un horario: "llegando" con su icono; el resto, como texto. */
function TimeText({ text }) {
  if (text === 'llegando') return <ArrivingTag />
  return text
}

/** Una lista de horarios ya armada ("llegando · 15 min · 34 min"), con "llegando" marcado. */
function TimesLabel({ label }) {
  return label.split(' · ').map((part, i) => (
    <Fragment key={i}>
      {i > 0 && ' · '}
      <TimeText text={part} />
    </Fragment>
  ))
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
            <span className="next-trains-times">
              <ClockIcon />
              <TimesLabel label={d.label ?? scheduleLabel(d)} />
            </span>
          </li>
        ))}
      </ul>
      <div className="next-trains-note">Sin datos en vivo: horario programado, puede variar.</div>
      {source && <div className="next-trains-note">Fuente: {source}</div>}
      {stale && <div className="next-trains-note stale-note">{STALE_TEXT}</div>}
    </div>
  )
}
