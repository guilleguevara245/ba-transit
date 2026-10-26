import { useApi } from '../hooks/useApi.js'
import { EVENT_KINDS, eventWhen, prettyStreets } from '../utils/events.js'
import './EventCard.css'

const REFRESH_MS = 10 * 60_000
const MAX_EVENTS = 5

/**
 * Eventos y cortes del inicio: eventos masivos, manifestaciones y obras
 * grandes que cortan calles (cargados a mano). Siempre
 * visible, debajo de las tarifas: si no hay ninguno lo dice, asi se sabe
 * que la seccion existe.
 */
export default function EventsSection() {
  const { data, loading } = useApi('/api/v1/eventos', { refreshMs: REFRESH_MS })
  const events = data?.events ?? []
  const shown = events.slice(0, MAX_EVENTS)

  return (
    <section className="panel events-panel" aria-label="Eventos y cortes">
      <div className="panel-title">
        Eventos y cortes
        {events.length > 0 && <span className="count">{events.length}</span>}
      </div>

      {!loading && events.length === 0 && (
        <p className="events-empty">Sin cortes ni eventos programados por ahora.</p>
      )}

      {shown.length > 0 && (
        <ul className="events-list">
          {shown.map((event) => {
            const kind = EVENT_KINDS[event.kind] ?? EVENT_KINDS.CORTE
            const streets = prettyStreets(event.streets)
            return (
              <li key={event.id}>
                <div className="event-card-head">
                  <span className={`event-kind ${kind.className}`}>{kind.label}</span>
                  <span className="event-when">{eventWhen(event)}</span>
                </div>
                <div className="events-list-title">
                  {event.url ? (
                    <a href={event.url} target="_blank" rel="noreferrer">
                      {event.title} ↗
                    </a>
                  ) : (
                    event.title
                  )}
                </div>
                {streets && <div className="event-streets">{streets}</div>}
              </li>
            )
          })}
        </ul>
      )}
      {events.length > MAX_EVENTS && <p className="events-more">Y {events.length - MAX_EVENTS} más.</p>}

      <p className="events-source">Eventos masivos y cortes destacados, cargados a partir de anuncios oficiales.</p>
    </section>
  )
}
