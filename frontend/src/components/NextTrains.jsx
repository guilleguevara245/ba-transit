import { useApi } from '../hooks/useApi.js'
import { formatArrival, nextTrainsPath } from '../utils/nextTrains.js'

const REFRESH_MS = 30_000

/**
 * Proximos trenes en vivo de una estacion: subte (pronostico de la API
 * Transporte) o Belgrano Norte (Ferrovias). Si el servidor no tiene datos, no muestra nada
 * (tampoco la tarjeta: con asCard el contenedor lo pone este componente,
 * asi no queda un cuadro vacio en la pagina de la estacion).
 */
export default function NextTrains({ mode = 'SUBTE', lineCode, stationName, asCard = false }) {
  const path = nextTrainsPath(mode, lineCode, stationName)
  const { data } = useApi(path, { refreshMs: REFRESH_MS })
  if (!data?.available) return null

  const content = (
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
              <span className="next-trains-times">
                {d.arrivals.map((a, i) => (
                  <span key={i}>
                    {i > 0 && ' · '}
                    {formatArrival(a)}
                    {a.destination && a.destination !== d.towards && (
                      <span className="next-trains-dest"> (a {a.destination})</span>
                    )}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
      {data.directions.some((d) => d.arrivals.some((a) => a.estimated)) && (
        <div className="next-trains-note">~ estimado</div>
      )}
      {data.source && <div className="next-trains-note">Fuente: {data.source}</div>}
    </div>
  )
  return asCard ? <section className="station-card">{content}</section> : content
}
