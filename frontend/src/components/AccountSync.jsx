import { useEffect } from 'react'
import { FAVORITES_CHANGED } from '../utils/favoritesStore.js'
import { refreshUser, schedulePlacesPush, schedulePush, syncFavorites, syncPlaces } from '../utils/account.js'
import { PLACES_CHANGED } from '../utils/placesStore.js'
import { getSession } from '../utils/session.js'
import { scheduleFavoritesSync, upgradeSubscription } from '../utils/push.js'

/**
 * Con sesion: al abrir el sitio confirma la cuenta y trae sus favoritos y lugares, y
 * despues sube cada cambio de favoritos. Con avisos activos, les pasa los
 * favoritos nuevos. No dibuja nada.
 */
export default function AccountSync() {
  useEffect(() => {
    if (getSession()) {
      refreshUser()
        .then(() => (getSession() ? syncFavorites() : null))
        .then(() => (getSession() ? syncPlaces() : null))
        .catch(() => {})
    }
    // Quien ya tenia avisos recibe una vez los tipos nuevos (clima, tarifas, servicios especiales).
    upgradeSubscription().catch(() => {})
    window.addEventListener(FAVORITES_CHANGED, schedulePush)
    window.addEventListener(PLACES_CHANGED, schedulePlacesPush)
    // Los avisos de este navegador tambien siguen los favoritos.
    window.addEventListener(FAVORITES_CHANGED, scheduleFavoritesSync)
    return () => {
      window.removeEventListener(FAVORITES_CHANGED, schedulePush)
      window.removeEventListener(PLACES_CHANGED, schedulePlacesPush)
      window.removeEventListener(FAVORITES_CHANGED, scheduleFavoritesSync)
    }
  }, [])
  return null
}
