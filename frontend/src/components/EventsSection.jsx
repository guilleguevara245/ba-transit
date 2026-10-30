import { useState } from 'react'
import NewsList from './NewsList.jsx'
import { useApi } from '../hooks/useApi.js'
import { EVENT_KINDS, eventWhen, prettyStreets } from '../utils/events.js'
import './EventCard.css'

const REFRESH_MS = 10 * 60_000
const MAX_EVENTS = 5
const TAB_KEY = 'ba-transit:novedades'

function readTab() {
  try {
    return window.localStorage.getItem(TAB_KEY) === 'noticias' ? 'noticias' : 'eventos'
  } catch {
    return 'eventos'
  }
}

/** La lista de eventos y cortes (las primeras MAX_EVENTS). */
function EventsList({ events, loading }) {
  const shown = events.slice(0, MAX_EVENTS)
  return (
    <>
      {!loading && events.length === 0 && <p className="events-empty">Sin cortes ni eventos programados por ahora.</p>}

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
    </>
  )
}

/**
 * Eventos y cortes del inicio: eventos masivos, manifestaciones y obras
 * grandes que cortan calles (cargados a mano). Siempre
 * visible, debajo de las tarifas: si no hay ninguno lo dice, asi se sabe
 * que la seccion existe. Al lado, la pestaña Noticias (titulares del
 * transporte del AMBA); la ultima elegida se recuerda.
 */
export default function EventsSection() {
  const [tab, setTab] = useState(readTab)
  const { data, loading } = useApi('/api/v1/eventos', { refreshMs: REFRESH_MS })
  const events = data?.events ?? []

  function choose(next) {
    setTab(next)
    try {
      window.localStorage.setItem(TAB_KEY, next)
    } catch {
      // Sin almacenamiento: la pestaña dura lo que dura la pagina.
    }
  }

  return (
    <section className="panel events-panel" aria-label="Eventos, cortes y noticias">
      <div className="panel-title events-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          id="tab-eventos"
          aria-selected={tab === 'eventos'}
          aria-controls="panel-novedades"
          className={tab === 'eventos' ? 'active' : ''}
          onClick={() => choose('eventos')}
        >
          Eventos y cortes
          {events.length > 0 && <span className="count">{events.length}</span>}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-noticias"
          aria-selected={tab === 'noticias'}
          aria-controls="panel-novedades"
          className={tab === 'noticias' ? 'active' : ''}
          onClick={() => choose('noticias')}
        >
          Noticias
        </button>
      </div>

      <div id="panel-novedades" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'noticias' ? (
          <>
            <NewsList />
            <p className="events-source">
              Titulares de enelSubte y Google Noticias. Cada nota se lee en el sitio del medio.
            </p>
          </>
        ) : (
          <EventsList events={events} loading={loading} />
        )}
      </div>
    </section>
  )
}
