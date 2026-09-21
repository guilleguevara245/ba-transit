import './FaresPanel.css'
import { formatCurrency } from '../utils/format.js'
import { MODE_LABELS } from '../constants.js'

function fareLabel(fare) {
  const modeLabel = MODE_LABELS[fare.mode] ?? fare.mode

  if (fare.minKm == null && fare.maxKm == null) {
    return `${modeLabel}, tarifa plana`
  }
  if (fare.maxKm == null) {
    return `${modeLabel}, más de ${fare.minKm} km`
  }
  return `${modeLabel}, ${fare.minKm}-${fare.maxKm} km`
}

export default function FaresPanel({ fares }) {
  return (
    <div className="panel side-panel">
      <div className="panel-title">Tarifas vigentes</div>

      {fares.length === 0 && <div className="loading-text">Todavía no hay tarifas cargadas.</div>}

      {fares.map((fare) => (
        <div className="fare-row" key={fare.id}>
          <span className="name">{fareLabel(fare)}</span>
          <span className="value">{formatCurrency(fare.price)}</span>
        </div>
      ))}
    </div>
  )
}
