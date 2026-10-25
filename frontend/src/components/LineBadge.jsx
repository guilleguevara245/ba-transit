import { readableTextColor } from '../utils/color.js'
import './LineBadge.css'

/** Locomotora vista de frente, en una sola forma para que se lea chica. */
function TrainIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2c-4 0-7 .5-7 4v9.5A3.5 3.5 0 0 0 8.5 19L7 20.5v.5h2.2l2-2h1.6l2 2H17v-.5L15.5 19a3.5 3.5 0 0 0 3.5-3.5V6c0-3.5-3-4-7-4Zm-5 5h4.2v4H7V7Zm5.8 0H17v4h-4.2V7ZM8.5 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
      />
    </svg>
  )
}

/**
 * Badge circular de una linea con su color oficial. Subte y premetro
 * muestran su letra; los trenes, un icono de tren (sus codigos, como
 * "SAN_MARTIN", no entran en un circulo).
 */
export default function LineBadge({ line, size = 'md' }) {
  const isTrain = line.mode === 'TREN'
  const style = { background: line.colorHex, color: readableTextColor(line.colorHex) }

  return (
    <span className={`line-badge line-badge-${size}`} style={style} title={line.name}>
      {isTrain ? <TrainIcon /> : line.code}
    </span>
  )
}
