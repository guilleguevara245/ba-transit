import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'ba-transit:mis-lineas'
const CHANGE_EVENT = 'ba-transit:mis-lineas-cambio'

/**
 * Lee las favoritas guardadas. El almacenamiento del navegador puede no
 * estar disponible (modo privado, cookies bloqueadas) o tener datos
 * rotos: en ese caso se arranca con la lista vacia.
 */
export function readFavorites() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id) => Number.isInteger(id)) : []
  } catch {
    return []
  }
}

function writeFavorites(ids) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Sin almacenamiento disponible, las favoritas duran lo que dure la pagina.
  }
}

/**
 * "Mis lineas": ids de las lineas favoritas, guardados en este
 * navegador (sin cuentas ni backend). Todos los componentes que usan el
 * hook se mantienen sincronizados, incluso entre pestañas.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState(readFavorites)

  useEffect(() => {
    const sync = () => setFavorites(readFavorites())
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggle = useCallback((lineId) => {
    const current = readFavorites()
    const next = current.includes(lineId) ? current.filter((id) => id !== lineId) : [...current, lineId]
    writeFavorites(next)
    setFavorites(next)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  const isFavorite = useCallback((lineId) => favorites.includes(lineId), [favorites])

  return { favorites, toggle, isFavorite }
}
