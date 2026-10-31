import { distanceKm } from './map.js'
import { addressArea } from './placesStore.js'

/**
 * Los lugares de "Tu día": de donde se muestra el clima.
 *
 * Las coordenadas se redondean a una grilla de 0,05 grados (unos 5 km)
 * antes de salir del navegador: el servidor nunca recibe la ubicacion
 * exacta, y para el pronostico alcanza.
 */

/** Por defecto, sin lugares ni zona: la Ciudad. */
export const CAPITAL = { id: 'capital', label: 'Capital', detail: 'Elegí tu zona', lat: -34.6037, lon: -58.3816 }

/** Trabajo se muestra aparte solo si queda a mas de esto de Casa (si no, es el mismo clima). */
export const SAME_WEATHER_KM = 3

/** El centro de la celda de la grilla (0,05 grados). */
export function toGrid(value) {
  return Math.round(value * 20) / 20
}

/** "lat=-34.55&lon=-58.70": la celda del punto, para pedirle al servidor. */
export function gridQuery({ lat, lon }) {
  return `lat=${toGrid(lat).toFixed(2)}&lon=${toGrid(lon).toFixed(2)}`
}

/** Donde queda Casa o Trabajo: la estacion guardada o la zona de la direccion confirmada. */
function stationPoint(places, stations, tipo) {
  const place = places.find((p) => p.tipo === tipo && (p.estacion || p.lat != null))
  if (!place) return null
  if (!place.estacion) return { lat: place.lat, lon: place.lon, name: addressArea(place.direccion) ?? 'Tu dirección' }
  const station = stations?.find((s) => s.stationId === place.estacion)
  if (!station) return null
  return { lat: Number(station.latitude), lon: Number(station.longitude), name: station.stationName }
}

/**
 * [principal, trabajo?]. Principal: Casa (si es una estacion), si no la
 * zona elegida, si no Capital. Trabajo: si es una estacion y queda lejos
 * de la principal.
 */
export function weatherPlaces({ places = [], stations = null, zone = null }) {
  const home = stationPoint(places, stations, 'casa')
  const primary = home
    ? { id: 'casa', tipo: 'casa', label: 'Casa', detail: home.name, lat: home.lat, lon: home.lon }
    : zone
      ? { id: 'zona', tipo: 'otro', label: zone.nombre, detail: 'Tu zona', lat: zone.lat, lon: zone.lon }
      : { ...CAPITAL, tipo: 'otro', isDefault: true }
  const work = stationPoint(places, stations, 'trabajo')
  const list = [primary]
  if (
    work &&
    distanceKm({ latitude: primary.lat, longitude: primary.lon }, { latitude: work.lat, longitude: work.lon }) >
      SAME_WEATHER_KM
  ) {
    list.push({ id: 'trabajo', tipo: 'trabajo', label: 'Trabajo', detail: work.name, lat: work.lat, lon: work.lon })
  }
  return list
}
