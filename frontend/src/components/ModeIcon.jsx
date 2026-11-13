import { MODE_PATHS } from '../utils/modePaths.js'
import './ModeIcon.css'

/**
 * Icono de un modo de transporte en un cuadro redondeado. Los colores
 * salen de --mode-icon-bg y --mode-icon-fg, que cambian con el tema.
 */
export default function ModeIcon({ mode, size = 'md' }) {
  const path = MODE_PATHS[mode]
  if (!path) return null
  return (
    <span className={`mode-icon mode-icon-${size}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d={path} />
      </svg>
    </span>
  )
}
