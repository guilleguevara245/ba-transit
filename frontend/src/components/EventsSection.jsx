import { useApi } from '../hooks/useApi.js'
import EventCard from './EventCard.jsx'
import './EventCard.css'

const REFRESH_MS = 10 * 60_000

/**
 * Eventos y cortes: eventos masivos, manifestaciones y obras grandes que
 * cortan calles, de la API Transporte y cargados a mano. Si no hay
 * ninguno, la seccion no aparece.
 */
export default function EventsSection() {
  const { data } = useApi('/api/v1/eventos', { refreshMs: REFRESH_MS })
  const events = data?.events ?? []
  if (events.length === 0) return null

  return (
    <section className="events-section" aria-label="Eventos y cortes">
      <div className="section-label">Eventos y cortes</div>
      <div className="events-grid">
        {events.slice(0, 6).map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      <p className="events-source">Cortes programados del Gobierno de la Ciudad (API Transporte) y eventos destacados.</p>
    </section>
  )
}
