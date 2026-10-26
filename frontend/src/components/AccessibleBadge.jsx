import './AccessibleBadge.css'

/** Simbolo internacional de accesibilidad, simplificado para tamano chico. */
const PATH = 'M12 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM10 7h4l-.5 5H17l2 6M13.5 12h-4M9.3 9.6A5.5 5.5 0 1 0 15.8 17'

/** Marca de estacion accesible (segun Emova). */
export default function AccessibleBadge() {
  return (
    <span className="accessible-badge" title="Estación accesible según Emova">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={PATH} />
      </svg>
      Accesible
    </span>
  )
}
