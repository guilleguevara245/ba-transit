import { readableTextColor } from '../utils/color.js'
import './StationIcon.css'

/**
 * Icono de estacion (el mismo dibujo de las notificaciones del celular):
 * techo, columnas y anden, sobre un circulo del color de la linea.
 */
export default function StationIcon({ color, size = 30 }) {
  const ink = readableTextColor(color)
  return (
    <span
      className="station-icon"
      style={{ width: size, height: size, background: color, color: ink }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M2.5 8.5 5 5h14l2.5 3.5z" fill="currentColor" />
        <path d="M6 8.5V17M18 8.5V17M2 17.5h20M10 12.5h4" />
      </svg>
    </span>
  )
}
