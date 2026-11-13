import { Link } from 'react-router-dom'
import FavoriteButton from './FavoriteButton.jsx'
import { useApi } from '../hooks/useApi.js'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { busTitle, headsignName, nextBusText, parseStopFavorite, stopName } from '../utils/busNames.js'
import './MyLines.css'

const REFRESH_MS = 30_000

/**
 * Una parada favorita: el proximo colectivo de esa linea que viene hacia
 * ella ("6 min · a 3 paradas", o "Llegando"), segun su posicion en vivo y
 * los minutos entre paradas del horario.
 */
function StopRow({ id, inPanel }) {
  const fav = parseStopFavorite(id)
  const { data, error, loading } = useApi(
    fav
      ? `/api/v1/colectivos/${encodeURIComponent(fav.routeId)}/parada/${encodeURIComponent(fav.stopId)}?sentido=${fav.directionId}`
      : null,
    { refreshMs: REFRESH_MS },
  )
  if (!fav) return null

  const gone = String(error ?? '').includes('respondió 404')
  const line = data?.line
  const name = data ? stopName(data.stopName) : gone ? 'Parada que ya no está en el recorrido' : 'Parada'
  const to = data ? headsignName(data.headsign) : ''
  const href = `/colectivos?${new URLSearchParams({
    ...(line ? { linea: line } : {}),
    id: fav.routeId,
    sentido: String(fav.directionId),
    parada: fav.stopId,
  })}`
  const next = nextBusText(data?.buses)
  const times = (data?.buses ?? [])
    .slice(0, 2)
    .map((b) => (b.arriving ? 'Llegando' : b.minutes != null ? `${b.minutes} min` : null))
    .filter(Boolean)

  let status
  if (!data) {
    status = loading ? <small>Buscando…</small> : null
  } else if (!data.live) {
    status = <small>Sin datos en vivo</small>
  } else if (!next) {
    status = <small>Ninguno en camino</small>
  } else {
    status = (
      <>
        <strong>
          <i className="live-dot" aria-hidden="true" />
          {times.length > 0 ? times.join(' · ') : next.time}
        </strong>
        {next.detail && <small>{next.detail}</small>}
      </>
    )
  }

  return (
    <div className="my-line-card">
      <div className="my-line my-line-stop">
        {inPanel && <span className="fav-kind">Parada</span>}
        <Link to={href} className="my-line-link">
          <span className="my-bus-number">{line ?? '·'}</span>
          <span className="my-place-text">
            <span className="my-line-name">{name}</span>
            {line && (
              <small>
                {busTitle({ shortName: line })}
                {to && ` · hacia ${to}`}
              </small>
            )}
          </span>
        </Link>
        {status && (
          <span className="my-stop-next" aria-live="polite">
            {status}
          </span>
        )}
        <FavoriteButton kind="paradas" id={id} name={`${name}${line ? `, línea ${line}` : ''}`} compact />
      </div>
    </div>
  )
}

/** "Mis paradas": cada parada favorita con el proximo colectivo que viene. */
export default function MyStops({ inPanel = false }) {
  const { ids } = useFavoriteList('paradas')
  if (ids.length === 0) return null
  const rows = ids.map((id) => <StopRow key={id} id={id} inPanel={inPanel} />)
  if (inPanel) return <>{rows}</>
  return (
    <section className="my-lines" aria-label="Mis paradas">
      <div className="section-label">Mis paradas</div>
      <div className="my-lines-row">{rows}</div>
    </section>
  )
}
