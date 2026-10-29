import { useCallback, useEffect, useState } from 'react'
import { FAVORITES_CHANGED, FAVORITE_KINDS, readList, toggleInList } from '../utils/favoritesStore.js'

/**
 * Una lista de favoritos ("lineas", "estaciones" o "accesos"), siempre al
 * dia: todos los componentes que la usan se sincronizan, incluso entre
 * pestañas.
 */
export function useFavoriteList(kind) {
  const [ids, setIds] = useState(() => readList(kind))

  useEffect(() => {
    const sync = () => setIds(readList(kind))
    const onStorage = (event) => {
      if (event.key === null || event.key === FAVORITE_KINDS[kind].key) sync()
    }
    window.addEventListener(FAVORITES_CHANGED, sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(FAVORITES_CHANGED, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [kind])

  const toggle = useCallback((id) => setIds(toggleInList(kind, id)), [kind])
  const has = useCallback((id) => ids.includes(id), [ids])

  return { ids, toggle, has }
}
