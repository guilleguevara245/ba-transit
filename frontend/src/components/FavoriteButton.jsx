import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { FAVORITE_KINDS } from '../utils/favoritesStore.js'
import './FavoriteButton.css'

/**
 * Estrella para agregar o quitar un favorito. kind: "lineas" (por defecto),
 * "estaciones" o "accesos"; id: el de la linea, estacion o acceso; name:
 * como se lee en voz alta ("Linea B", "Medrano, Linea B").
 * lineId y lineName se aceptan por compatibilidad (Mis lineas).
 */
export default function FavoriteButton({ kind = 'lineas', id, name, lineId, lineName, compact = false }) {
  const { has, toggle } = useFavoriteList(kind)
  const itemId = id ?? lineId
  const itemName = name ?? lineName
  const list = FAVORITE_KINDS[kind].title
  const active = has(itemId)
  const label = active ? `Quitar ${itemName} de ${list}` : `Agregar ${itemName} a ${list}`

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
        toggle(itemId)
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />
      </svg>
      {!compact && <span>{active ? `En ${list}` : `Agregar a ${list}`}</span>}
    </button>
  )
}
