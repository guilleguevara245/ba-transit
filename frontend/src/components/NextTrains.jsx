import { useApi } from '../hooks/useApi.js'

const REFRESH_MS = 30_000

function formatMinutes({ minutes, estimated }) {
  const text = minutes < 1 ? 'llegando' : `${minutes} min`
  return estimated ? `~${text}` : text
}

/**
 * Proximos trenes de una estacion de subte, segun el pronostico en vivo
 * de la API Transporte. Si el servidor no tiene datos, no muestra nada.
 */
export default function NextTrains({ lineCode, stationName }) {
  const path = `/api/v1/subte/proximos?linea=${encodeURIComponent(lineCode)}&estacion=${encodeURIComponent(stationName)}`
  const { data } = useApi(path, { refreshMs: REFRESH_MS })
  if (!data?.available) return null

  return (
    <div className="station-popup-section next-trains">
      <div className="station-popup-label">
        Próximos trenes <span className="live-dot" aria-hidden="true" />
      </div>
      {data.directions.length === 0 ? (
        <div className="next-trains-empty">Sin trenes informados en este momento.</div>
      ) : (
        <ul className="next-trains-list">
          {data.directions.map((d) => (
            <li key={d.directionId}>
              <span className="next-trains-towards">Hacia {d.towards}</span>
              <span className="next-trains-times">{d.arrivals.map(formatMinutes).join(' · ')}</span>
            </li>
          ))}
        </ul>
      )}
      {data.directions.some((d) => d.arrivals.some((a) => a.estimated)) && (
        <div className="next-trains-note">~ estimado</div>
      )}
    </div>
  )
}
