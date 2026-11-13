import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import FavoriteButton from './FavoriteButton.jsx'
import { ArrivingTag, ClockIcon } from './NextTrains.jsx'
import { useApi } from '../hooks/useApi.js'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import {
  busSignsTitle,
  headsignName,
  nextBusText,
  parseBusShortName,
  parseStopFavorite,
  sameBusNumber,
  stopName,
} from '../utils/busNames.js'
import './MyLines.css'

const REFRESH_MS = 30_000

/**
 * Una parada favorita: el proximo colectivo de esa linea que viene hacia
 * ella ("6 min · a 3 paradas", o "Llegando"), segun su posicion en vivo y
 * los minutos entre paradas del horario. Si paran otros carteles de la
 * misma linea u otros colectivos favoritos, tambien se cuentan y cada
 * horario lleva su cartel.
 */
function StopRow({ id, inPanel, favoriteBuses }) {
  const fav = parseStopFavorite(id)
  // Los otros colectivos favoritos tambien se avisan si paran en esta parada (303 y 163, para el mismo viaje).
  const others = favoriteBuses.length ? `&lineas=${encodeURIComponent(favoriteBuses.join(','))}` : ''
  const { data, error, loading } = useApi(
    fav
      ? `/api/v1/colectivos/${encodeURIComponent(fav.routeId)}/parada/${encodeURIComponent(fav.stopId)}?sentido=${fav.directionId}${others}`
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
  // Si paran varios carteles de la linea (42A y 42B), cada horario dice de cual es.
  const lines = data?.lines?.length ? data.lines : line ? [line] : []
  const severalSigns = lines.length > 1
  const oneNumber = sameBusNumber(lines)
  // Los dos proximos: "llegando" con el colectivo de frente (como los trenes) o los minutos.
  const times = (data?.buses ?? [])
    .slice(0, 2)
    .map((b) => {
      const when = b.arriving ? <ArrivingTag kind="bus" /> : b.minutes != null ? `${b.minutes} min` : null
      if (!when) return null
      // La letra si son carteles de la misma linea; si no, el numero entero ("163").
      const sign = severalSigns && b.line ? (oneNumber ? parseBusShortName(b.line).sign || b.line : b.line) : null
      return (
        <span key={b.id} className="my-stop-time">
          {sign && (
            <span className="my-stop-sign" title={oneNumber ? `Cartel ${sign}` : `Línea ${sign}`}>
              {sign}
            </span>
          )}
          {when}
        </span>
      )
    })
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
          <ClockIcon />
          {times.length > 0
            ? times.map((t, i) => (
                <Fragment key={i}>
                  {i > 0 && ' · '}
                  {t}
                </Fragment>
              ))
            : next.time}
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
          <span className="my-bus-number">{severalSigns && oneNumber ? parseBusShortName(line).number : (line ?? '·')}</span>
          <span className="my-place-text">
            <span className="my-line-name">{name}</span>
            {line && (
              <small>
                {busSignsTitle(lines)}
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
  const { ids: buses } = useFavoriteList('colectivos')
  if (ids.length === 0) return null
  const rows = ids.map((id) => <StopRow key={id} id={id} inPanel={inPanel} favoriteBuses={buses} />)
  if (inPanel) return <>{rows}</>
  return (
    <section className="my-lines" aria-label="Mis paradas">
      <div className="section-label">Mis paradas</div>
      <div className="my-lines-row">{rows}</div>
    </section>
  )
}
