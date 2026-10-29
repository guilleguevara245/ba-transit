import { useEffect } from 'react'
import { FAVORITES_CHANGED } from '../utils/favoritesStore.js'
import { refreshUser, schedulePush, syncFavorites } from '../utils/account.js'
import { getSession } from '../utils/session.js'

/**
 * Con sesion: al abrir el sitio confirma la cuenta y trae sus favoritos, y
 * despues sube cada cambio de favoritos. Sin sesion no hace nada. No dibuja nada.
 */
export default function AccountSync() {
  useEffect(() => {
    if (getSession()) {
      refreshUser()
        .then(() => (getSession() ? syncFavorites() : null))
        .catch(() => {})
    }
    window.addEventListener(FAVORITES_CHANGED, schedulePush)
    return () => window.removeEventListener(FAVORITES_CHANGED, schedulePush)
  }, [])
  return null
}
