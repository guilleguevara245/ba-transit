import { useEffect } from 'react'
import { FAVORITES_CHANGED } from '../utils/favoritesStore.js'
import {
  refreshUser,
  schedulePlacesPush,
  schedulePrefsPush,
  schedulePush,
  syncFavorites,
  syncPlaces,
  syncPreferences,
} from '../utils/account.js'
import { PREFS_CHANGED } from '../utils/prefsEvents.js'
import { PLACES_CHANGED } from '../utils/placesStore.js'
import { ZONE_CHANGED } from '../utils/weatherZone.js'
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
        .then(() => (getSession() ? syncPreferences() : null))
        .catch(() => {})
    }
    // Quien ya tenia avisos recibe una vez los tipos nuevos (clima, tarifas, servicios especiales).
    upgradeSubscription().catch(() => {})
    window.addEventListener(FAVORITES_CHANGED, schedulePush)
    window.addEventListener(PLACES_CHANGED, schedulePlacesPush)
    window.addEventListener(PREFS_CHANGED, schedulePrefsPush)
    // Los avisos de este navegador tambien siguen los favoritos y las zonas (Casa, Trabajo, zona del clima).
    window.addEventListener(FAVORITES_CHANGED, scheduleFavoritesSync)
    window.addEventListener(PLACES_CHANGED, scheduleFavoritesSync)
    window.addEventListener(ZONE_CHANGED, scheduleFavoritesSync)
    return () => {
      window.removeEventListener(FAVORITES_CHANGED, schedulePush)
      window.removeEventListener(PLACES_CHANGED, schedulePlacesPush)
      window.removeEventListener(PREFS_CHANGED, schedulePrefsPush)
      window.removeEventListener(FAVORITES_CHANGED, scheduleFavoritesSync)
      window.removeEventListener(PLACES_CHANGED, scheduleFavoritesSync)
      window.removeEventListener(ZONE_CHANGED, scheduleFavoritesSync)
    }
  }, [])
  return null
}
