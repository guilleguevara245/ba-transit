import { readableTextColor } from '../utils/color.js'
import './BusIcon.css'

/** Colectivo de frente (el mismo dibujo del mapa) y cartel de parada en su poste. */
const PATHS = {
  bus: 'M6 3h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM4 11h16M8 21v-3m8 3v-3M7.5 14.5h.01m9 0h.01',
  stop: 'M6.5 3h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM12 12v9M8.5 21h7M9 7.5h6',
}

/** Amarillo con borde oscuro, como el colectivo en vivo del mapa. */
const LIVE = { background: '#f4c11b', color: '#17171a', borderColor: '#17171a' }

/**
 * Icono cuadrado para las tarjetas de colectivos: kind="bus" (un
 * colectivo en vivo, en amarillo como en el mapa) o kind="stop" (una
 * parada, del color de la linea).
 */
export default function BusIcon({ kind = 'bus', color, size = 30 }) {
  const fill = color ?? '#17171a'
  const style = kind === 'bus' ? LIVE : { background: fill, color: readableTextColor(fill) }
  // Sin color de linea, la parada va oscura: con el tema oscuro lleva un borde para que no se pierda.
  const className = kind === 'stop' && !color ? 'bus-icon plain' : 'bus-icon'
  return (
    <span className={className} style={{ ...style, width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d={PATHS[kind]} />
      </svg>
    </span>
  )
}
