import { useMemo } from 'react'
import { useApi } from './useApi.js'
import { useSavedPlaces } from './useSavedPlaces.js'
import { useWeatherZone } from './useWeatherZone.js'
import { weatherPlaces } from '../utils/weatherPlaces.js'

/**
 * Los lugares del clima (Casa, Trabajo, tu zona o Capital). ready: false
 * mientras faltan las estaciones para ubicar Casa o Trabajo (asi no se
 * pide primero el clima de Capital y despues el de Casa).
 */
export function useWeatherPlaces() {
  const { places } = useSavedPlaces()
  const { zone } = useWeatherZone()
  const needsStations = places.some((p) => (p.tipo === 'casa' || p.tipo === 'trabajo') && p.estacion)
  const { data: stations } = useApi(needsStations ? '/api/v1/map/stations' : null)
  const ready = !needsStations || Boolean(stations)
  const list = useMemo(() => weatherPlaces({ places, stations, zone }), [places, stations, zone])
  return { places: list, ready, zone }
}
