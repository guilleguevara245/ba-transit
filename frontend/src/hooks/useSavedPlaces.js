import { useCallback, useEffect, useState } from 'react'
import { PLACES_CHANGED, PLACES_KEY, readPlaces, writePlaces } from '../utils/placesStore.js'

/** Mis lugares, siempre al dia (tambien entre pestañas). save reemplaza la lista entera. */
export function useSavedPlaces() {
  const [places, setPlaces] = useState(readPlaces)

  useEffect(() => {
    const sync = () => setPlaces(readPlaces())
    const onStorage = (event) => {
      if (event.key === null || event.key === PLACES_KEY) sync()
    }
    window.addEventListener(PLACES_CHANGED, sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(PLACES_CHANGED, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const save = useCallback((list) => setPlaces(writePlaces(list)), [])
  return { places, save }
}
