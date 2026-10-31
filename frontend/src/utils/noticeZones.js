import { placePoint, toGrid } from './weatherPlaces.js'

/**
 * Las zonas que se mandan con la suscripcion a los avisos, para recibir
 * solo las alertas del SMN que te alcanzan: Casa, Trabajo y la zona del
 * clima, como celdas de la grilla de 0,05 grados (unos 5 km). Sin ninguna,
 * llegan las de todo el AMBA.
 */

/** Si Casa o Trabajo estan guardados como estacion (hacen falta las estaciones para ubicarlos). */
export function needsStations(places = []) {
  return places.some((p) => (p.tipo === 'casa' || p.tipo === 'trabajo') && p.estacion)
}

/** [{ tipo: 'casa' | 'trabajo' | 'zona', lat, lon }], redondeadas a la grilla. */
export function noticeZones({ places = [], stations = null, zone = null }) {
  const out = []
  for (const tipo of ['casa', 'trabajo']) {
    const point = placePoint(places, stations, tipo)
    if (point) out.push({ tipo, lat: toGrid(point.lat), lon: toGrid(point.lon) })
  }
  if (zone) out.push({ tipo: 'zona', lat: toGrid(zone.lat), lon: toGrid(zone.lon) })
  return out
}
