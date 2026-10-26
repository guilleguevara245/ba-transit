import { useMemo, useState } from 'react'
import { estimateTrip, formatDuration } from '../utils/travelTime.js'
import './TravelTimeCard.css'

/**
 * Calculadora de tiempo de viaje entre dos estaciones de la linea (mismo
 * ramal), estimado por distancia y velocidad comercial del modo.
 * stations: estaciones de la linea con coordenadas (formato del mapa).
 */
export default function TravelTimeCard({ line, stations }) {
  const branches = useMemo(() => {
    const byBranch = new Map()
    for (const s of stations) {
      if (!byBranch.has(s.branchId)) byBranch.set(s.branchId, [])
      byBranch.get(s.branchId).push(s)
    }
    return [...byBranch.values()].map((list) => [...list].sort((a, b) => a.sequenceOrder - b.sequenceOrder))
  }, [stations])

  const [branchIndex, setBranchIndex] = useState(0)
  const branch = branches[branchIndex] ?? []
  const [from, setFrom] = useState(0)
  // null = la estacion siguiente a la de origen (las estaciones pueden
  // llegar despues del primer render, asi que no se calcula de entrada).
  const [to, setTo] = useState(null)

  if (branch.length < 2) return null
  const clamp = (index) => Math.max(0, Math.min(index, branch.length - 1))
  const safeFrom = clamp(from)
  const safeTo = clamp(to ?? safeFrom + 1)
  const trip = estimateTrip(branch, safeFrom, safeTo, line.mode)

  function changeBranch(index) {
    setBranchIndex(index)
    setFrom(0)
    setTo(null)
  }

  return (
    <section className="travel-card" style={{ '--line-color': line.colorHex }} aria-label="Tiempo de viaje">
      <h2 className="travel-title">Tiempo de viaje</h2>

      {branches.length > 1 && (
        <label className="travel-field">
          <span>Ramal</span>
          <select value={branchIndex} onChange={(e) => changeBranch(Number(e.target.value))}>
            {branches.map((b, i) => (
              <option key={b[0].branchId} value={i}>
                {b[0].stationName} – {b[b.length - 1].stationName}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="travel-row">
        <label className="travel-field">
          <span>Desde</span>
          <select value={safeFrom} onChange={(e) => setFrom(Number(e.target.value))}>
            {branch.map((s, i) => (
              <option key={s.stationId} value={i}>
                {s.stationName}
              </option>
            ))}
          </select>
        </label>
        <label className="travel-field">
          <span>Hasta</span>
          <select value={safeTo} onChange={(e) => setTo(Number(e.target.value))}>
            {branch.map((s, i) => (
              <option key={s.stationId} value={i}>
                {s.stationName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {safeFrom === safeTo ? (
        <p className="travel-result-empty">Elegí dos estaciones distintas.</p>
      ) : (
        <p className="travel-result">
          <strong>≈ {formatDuration(trip.minutes)}</strong>
          <span>
            {trip.stops} {trip.stops === 1 ? 'estación' : 'estaciones'} · {trip.km.toFixed(1).replace('.', ',')} km
          </span>
        </p>
      )}
      <p className="travel-note">Estimado según la distancia y la velocidad promedio del servicio; no incluye la espera.</p>
    </section>
  )
}
