import { useApi } from '../hooks/useApi.js'

const REFRESH_MS = 30_000

function minutes({ minutes: value, estimated }) {
  const text = value < 1 ? 'llegando' : `${value} min`
  return estimated ? `~${text}` : text
}

/** Version compacta de los proximos trenes, para las tarjetas de "Mis lineas". */
export default function MiniNextTrains({ lineCode, stationName }) {
  const path = `/api/v1/subte/proximos?linea=${encodeURIComponent(lineCode)}&estacion=${encodeURIComponent(stationName)}`
  const { data, loading } = useApi(path, { refreshMs: REFRESH_MS })

  if (loading) return <div className="mini-trains-empty">Buscando trenes…</div>
  if (!data?.available) return <div className="mini-trains-empty">Sin datos en vivo ahora.</div>
  if (data.directions.length === 0) return <div className="mini-trains-empty">Sin trenes informados.</div>

  return (
    <ul className="mini-trains">
      {data.directions.map((d) => (
        <li key={d.directionId}>
          <span className="mini-trains-towards">→ {d.towards}</span>
          <strong>{d.arrivals.slice(0, 2).map(minutes).join(' · ')}</strong>
        </li>
      ))}
    </ul>
  )
}
