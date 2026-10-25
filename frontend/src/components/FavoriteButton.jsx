import { useFavorites } from '../hooks/useFavorites.js'
import './FavoriteButton.css'

/** Estrella para agregar o quitar una linea de "Mis lineas". */
export default function FavoriteButton({ lineId, lineName, compact = false }) {
  const { isFavorite, toggle } = useFavorites()
  const active = isFavorite(lineId)
  const label = active ? `Quitar ${lineName} de Mis líneas` : `Agregar ${lineName} a Mis líneas`

  return (
    <button
      type="button"
      className={['favorite-button', active && 'active', compact && 'compact'].filter(Boolean).join(' ')}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={(event) => {
        // Dentro de una tarjeta-enlace, la estrella no debe navegar.
        event.preventDefault()
        event.stopPropagation()
        toggle(lineId)
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />
      </svg>
      {!compact && <span>{active ? 'En Mis líneas' : 'Agregar a Mis líneas'}</span>}
    </button>
  )
}
