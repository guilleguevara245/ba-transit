import { distanceKm } from './map.js'
import { toGrid } from './weatherPlaces.js'

/**
 * Confirmacion de direcciones de Mis lugares con Georef (datos.gob.ar),
 * a traves del servidor: /api/v1/direcciones?q=...
 *
 * De la direccion confirmada se guarda el texto, la zona (grilla de 0,05
 * grados, unos 5 km) y la estacion mas cercana. Las coordenadas exactas
 * solo se usan en el navegador para buscar esa estacion.
 */

/** Con menos letras que esto no se busca. */
export const MIN_ADDRESS_QUERY = 4
/** Espera despues de la ultima tecla antes de buscar (ms). */
export const ADDRESS_DEBOUNCE_MS = 450
/** Mas lejos que esto, la estacion no cuenta como "cercana" (el viaje se abre en Google Maps). */
export const NEAR_STATION_KM = 3

/** La busqueda limpia, o null si es muy corta para buscar. */
export function addressQuery(text) {
  const q = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  return q.length >= MIN_ADDRESS_QUERY ? q : null
}

/** "Tte Origone 151, Hurlingham": el texto que se guarda. */
export function addressText(address) {
  return address.area ? `${address.text}, ${address.area}` : address.text
}

/**
 * La estacion (de buildPlaces) mas cercana al punto, con la distancia en
 * km, o null si no hay ninguna a menos de maxKm.
 */
export function nearestStation(options, { lat, lon }, maxKm = NEAR_STATION_KM) {
  let best = null
  for (const option of options ?? []) {
    const km = distanceKm({ latitude: lat, longitude: lon }, option)
    if (Number.isFinite(km) && km <= maxKm && (!best || km < best.km)) best = { option, km }
  }
  return best
}

/** "lugar-123" (de buildPlaces) -> 123: la estacion que se guarda. */
export function stationIdOf(option) {
  return Number(String(option.stationId).replace('lugar-', ''))
}

/**
 * Lo que se guarda de una direccion elegida de la lista: texto, zona
 * redondeada y la estacion mas cercana (si hay una a menos de 3 km).
 */
export function confirmedPlace(address, options) {
  const near = nearestStation(options, address)
  return {
    direccion: addressText(address),
    lat: toGrid(address.lat),
    lon: toGrid(address.lon),
    cerca: near ? stationIdOf(near.option) : null,
  }
}

/** "a 400 m" / "a 1,2 km". */
export function distanceText(km) {
  if (km < 1) return `a ${Math.max(100, Math.round((km * 1000) / 100) * 100)} m`
  return `a ${km.toFixed(1).replace('.', ',')} km`
}

/** Para comparar direcciones: sin tildes, mayusculas ni puntuacion ("Av. Rivadavia" = "av rivadavia"). */
const comparable = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** La calle y altura de una direccion guardada ("Tte Origone 151, Hurlingham" -> "Tte Origone 151"), para buscarla. */
export function savedAddressQuery(direccion) {
  return String(direccion ?? '')
    .split(',')[0]
    .trim()
}

/**
 * De lo que encontro Georef para una direccion guardada, la que es esa
 * direccion: la de la misma localidad (si se guardo con localidad) o,
 * si no tiene, la primera. null si ninguna coincide.
 */
export function matchSavedAddress(results, direccion) {
  const list = results ?? []
  const parts = String(direccion ?? '').split(',')
  const area = comparable(parts.slice(1).join(','))
  if (!area) return list[0] ?? null
  return list.find((r) => comparable(r.area) === area) ?? null
}

/** Si lo elegido en un campo es esa direccion guardada (para no ofrecerla en el otro campo). */
export function isSavedAddress(address, direccion) {
  return Boolean(address?.text) && comparable(address.text) === comparable(savedAddressQuery(direccion))
}
