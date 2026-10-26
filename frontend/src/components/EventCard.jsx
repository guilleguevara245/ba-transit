import { EVENT_KINDS, eventWhen, prettyStreets } from '../utils/events.js'
import './EventCard.css'

/** Tarjeta de un evento masivo o corte (seccion Eventos y cortes, Accesos y estaciones). */
export default function EventCard({ event, extra, compact = false }) {
  const kind = EVENT_KINDS[event.kind] ?? EVENT_KINDS.CORTE
  const streets = prettyStreets(event.streets)
  // El feed a veces repite el tipo como descripcion ("OBRAS"): no aporta nada.
  const description =
    event.description && event.description.toLowerCase() !== event.title.toLowerCase().slice(0, event.description.length)
      ? event.description
      : null

  return (
    <article className={compact ? 'event-card compact' : 'event-card'}>
      <div className="event-card-head">
        <span className={`event-kind ${kind.className}`}>{kind.label}</span>
        <span className="event-when">{eventWhen(event)}</span>
      </div>
      <h3 className="event-title">{event.title}</h3>
      {streets && <div className="event-streets">{streets}</div>}
      {!compact && description && <p className="event-description">{description}</p>}
      {extra && <div className="event-extra">{extra}</div>}
      {event.url && (
        <a className="event-link" href={event.url} target="_blank" rel="noreferrer">
          Más información ↗
        </a>
      )}
    </article>
  )
}
