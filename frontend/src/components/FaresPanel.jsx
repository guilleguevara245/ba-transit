import './FaresPanel.css'
import { formatCurrency } from '../utils/format.js'
import { fareLabel } from '../utils/fares.js'

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
