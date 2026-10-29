import { useFavoriteList } from './useFavoriteList.js'
import { readList } from '../utils/favoritesStore.js'

/** Ids de las lineas de "Mis lineas" guardados en este navegador. */
export function readFavorites() {
  return readList('lineas')
}

/** "Mis lineas" (ver useFavoriteList: las estaciones y los accesos funcionan igual). */
export function useFavorites() {
  const { ids, toggle, has } = useFavoriteList('lineas')
  return { favorites: ids, toggle, isFavorite: has }
}
