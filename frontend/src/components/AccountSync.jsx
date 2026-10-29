import { useEffect } from 'react'
import { FAVORITES_CHANGED } from '../utils/favoritesStore.js'
import { refreshUser, schedulePush, syncFavorites } from '../utils/account.js'
import { getSession } from '../utils/session.js'
import { scheduleFavoritesSync } from '../utils/push.js'

/**
 * Con sesion: al abrir el sitio confirma la cuenta y trae sus favoritos, y
 * despues sube cada cambio de favoritos. Con avisos activos, les pasa los
 * favoritos nuevos. No dibuja nada.
 */
export default function AccountSync() {
  useEffect(() => {
    if (getSession()) {
      refreshUser()
        .then(() => (getSession() ? syncFavorites() : null))
        .catch(() => {})
    }
    window.addEventListener(FAVORITES_CHANGED, schedulePush)
    // Los avisos de este navegador tambien siguen los favoritos.
    window.addEventListener(FAVORITES_CHANGED, scheduleFavoritesSync)
    return () => {
      window.removeEventListener(FAVORITES_CHANGED, schedulePush)
      window.removeEventListener(FAVORITES_CHANGED, scheduleFavoritesSync)
    }
  }, [])
  return null
}
