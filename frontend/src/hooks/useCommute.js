import { useMemo } from 'react'
import { useApi } from './useApi.js'
import { useSavedPlaces } from './useSavedPlaces.js'
import { commuteTrip, hasCommute } from '../utils/commute.js'

/** El viaje de Casa al Trabajo (ver commuteTrip), o null. Pide las estaciones solo si hace falta. */
export function useCommute() {
  const { places } = useSavedPlaces()
  const { data: stations } = useApi(hasCommute(places) ? '/api/v1/map/stations' : null)
  return useMemo(() => commuteTrip(places, stations), [places, stations])
}
