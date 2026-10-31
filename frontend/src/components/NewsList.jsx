import { useMemo, useState } from 'react'
import Chevrons from './Chevrons.jsx'
import ExternalTitle from './ExternalTitle.jsx'
import { useApi } from '../hooks/useApi.js'
import { formatRelativeTime } from '../utils/format.js'
import { NEWS_CATEGORIES, dedupeNews, newsCounts } from '../utils/news.js'

const REFRESH_MS = 15 * 60_000
// Cuatro: con las tarifas arriba, asi la columna queda pareja con las cinco alertas de al lado.
const FIRST = 4

/**
 * Noticias del transporte del AMBA: titular, medio, hace cuanto y link a
 * la nota. Los chips filtran por tema, como las leyendas de los mapas.
 */
export default function NewsList() {
  const { data, loading, error } = useApi('/api/v1/noticias', { refreshMs: REFRESH_MS })
  const [category, setCategory] = useState(null)
  const [expanded, setExpanded] = useState(false)
  // La misma nota en varios medios queda una sola vez (la mas reciente).
  const items = useMemo(() => dedupeNews(data?.items ?? []), [data])
  const counts = newsCounts(items)
  const visible = category ? items.filter((n) => n.category === category) : items
  const shown = expanded ? visible : visible.slice(0, FIRST)

  if (loading) return <p className="events-empty">Cargando noticias…</p>
  if (error && items.length === 0) return <p className="events-empty">No pudimos cargar las noticias. Probá en un rato.</p>
  if (items.length === 0) {
    return (
      <p className="events-empty">
        {data?.updatedAt ? 'Sin noticias del transporte en los últimos días.' : 'Estamos juntando las noticias: volvé en unos minutos.'}
      </p>
    )
  }

  return (
    <>
      <div className="news-filters" role="group" aria-label="Filtrar las noticias por tema">
        <button
          type="button"
          className={category === null ? 'active' : ''}
          aria-pressed={category === null}
          onClick={() => setCategory(null)}
        >
          Todas <span>{items.length}</span>
        </button>
        {NEWS_CATEGORIES.filter((c) => counts[c.key] > 0).map((c) => (
          <button
            key={c.key}
            type="button"
            className={category === c.key ? 'active' : ''}
            aria-pressed={category === c.key}
            onClick={() => setCategory(category === c.key ? null : c.key)}
          >
            {c.label} <span>{counts[c.key]}</span>
          </button>
        ))}
      </div>

      <ul className="events-list news-list">
        {shown.map((n) => {
          const cat = NEWS_CATEGORIES.find((c) => c.key === n.category) ?? NEWS_CATEGORIES.at(-1)
          return (
            <li key={n.id}>
              <div className="event-card-head">
                <span className={`event-kind ${cat.className}`}>{cat.label}</span>
                <span className="news-meta">
                  {n.source} · {formatRelativeTime(n.publishedAt)}
                </span>
              </div>
              <div className="events-list-title">
                <a href={n.url} target="_blank" rel="noreferrer">
                  <ExternalTitle text={n.title} />
                </a>
              </div>
            </li>
          )
        })}
      </ul>
      {!expanded && visible.length > FIRST && (
        <button type="button" className="news-more chevrons-host" onClick={() => setExpanded(true)}>
          Ver las {visible.length} <Chevrons />
        </button>
      )}
    </>
  )
}
