import { useState } from 'react'
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
  // Cada vez que se marca: la estrella rebota y suelta unas chispas (key vuelve a correr la animacion).
  const [pop, setPop] = useState(0)

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
        if (!active) setPop((n) => n + 1)
      }}
    >
      <span className="favorite-star">
        <svg key={pop} viewBox="0 0 24 24" aria-hidden="true" className={pop && active ? 'favorite-pop' : undefined}>
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />
        </svg>
        {pop > 0 && active && <span key={`chispas-${pop}`} className="favorite-burst" aria-hidden="true" />}
      </span>
      {!compact && <span>{active ? `En ${list}` : `Agregar a ${list}`}</span>}
    </button>
  )
}
